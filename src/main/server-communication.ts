import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { store } from ".";
import { createToken, getAuthenticatedUser, getAuthUrl, getSession, scrobble } from "./lastfm";
import { AnalysisData, AnalysisSection, StartupData, Stream, UserResponse } from "../common/types";
import { electronApp, platform } from "@electron-toolkit/utils";
import { readZipContents } from "./utils";

const callbacks = {
  isAuthenticated() {
    return store.has("key");
  },
  async getAuthenticatedUser(): Promise<UserResponse | null> {
    try {
      return await getAuthenticatedUser();
    } catch {
      return null;
    }
  },
  getConfigPath() {
    return app.getPath("userData");
  },
  logout() {
    store.delete("key");
    store.delete("token");
  },
  focusFile(args: { path: string }) {
    shell.openPath(args.path);
  },
  getStartupData(): StartupData {
    return {
      scannedSongs: store.has("remainingSongs") ? store.get("remainingSongs").length : 0,
      scrobbledSongs: store.get("scrobbledSongs") || 0,
      initialScannedSongs: store.get("initialScannedSongs") || 0,
      scrobbleLimit: store.get("scrobbleLimit") || 2500,
      runOnStartup: platform.isLinux ? false : app.getLoginItemSettings().openAtLogin
    };
  },
  getSelectedFile(): string {
    return store.get("selectedFile");
  },
  setScrobbleLimit(args: { limit: number }) {
    store.set("scrobbleLimit", args.limit);
  },
  setRunOnStartup(args: { value: boolean }) {
    electronApp.setAutoLaunch(args.value);
  },
  getLastScrobbled(): Date {
    return store.get("lastScrobbled");
  }
};

const tasks = {
  async auth(mainWindow: BrowserWindow) {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      resizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      parent: mainWindow,
      title: "Last.FM Auth",
      webPreferences: {
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    store.set("token", await createToken());

    authWindow.on("ready-to-show", () => {
      authWindow.show();
    });

    authWindow.webContents.addListener("did-navigate", () => {
      authWindow.webContents.executeJavaScript(`
        try {
          if (document.querySelector(".alert.alert-success")) {
            window.close();
          } else {
            const cu_observer = new MutationObserver(() => {
              if (document.querySelector(".alert.alert-success")) {
                window.close();
              }
            });
            cu_observer.observe(document.body, { childList: true, subtree: true });
          }
        } catch {}
      `);
    });

    authWindow.on("closed", async () => {
      const session = await getSession();
      store.set("key", session.key);
      mainWindow.webContents.send("auth-done", session);
    });

    authWindow.loadURL(await getAuthUrl());
  },
  async selectZip(mainWindow: BrowserWindow) {
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: app.getPath("downloads"),
      filters: [
        {
          name: "Zip Files",
          extensions: ["zip"]
        }
      ]
    });

    const scannedSongs: Stream[] = [];

    if (!result.canceled) {
      store.set("selectedFile", result.filePaths[0]);

      for await (const history of readZipContents(result.filePaths[0])) {
        for (const stream of history) {
          if (stream.spotify_track_uri === null) {
            continue;
          }
          scannedSongs.push({
            album: stream.master_metadata_album_album_name!,
            artist: stream.master_metadata_album_artist_name!,
            date: stream.ts,
            name: stream.master_metadata_track_name!
          });
        }
        store.set("remainingSongs", scannedSongs);
        store.set("initialScannedSongs", scannedSongs.length);
        mainWindow.webContents.send("update-scanned-songs", {
          scannedSongs: scannedSongs.length
        });
      }
    }

    mainWindow.webContents.send("select-zip-done", {
      canceled: result.canceled,
      filePath: result.filePaths.length > 0 ? result.filePaths[0] : null,
      scannedSongs: scannedSongs.length
    });
  },
  async scrobbler(mainWindow: BrowserWindow) {
    store.set("lastScrobbled", new Date());

    const songs = store.get("remainingSongs");
    const limit = store.get("scrobbleLimit");

    let done = 0;
    for (let i = 0; i < Math.ceil(limit / 50); i++) {
      const section = songs.slice(i * 50, (i + 1) * 50);
      await scrobble(section);

      done += section.length;
      store.set("scrobbledSongs", (store.get("scrobbledSongs") || 0) + section.length);
      mainWindow.webContents.send("update-scrobbled-songs", {
        scrobbledSongs: store.get("scrobbledSongs")
      });
    }

    store.set("remainingSongs", songs.slice(done, songs.length));
  },
  async analyzer(mainWindow: BrowserWindow) {
    const analysis: AnalysisData = {
      albums: [],
      artists: [],
      platforms: [],
      songs: []
    };

    function pushRecord(
      key: "albums" | "artists" | "platforms" | "songs",
      record: { name: string; secondsPlayed: number }
    ) {
      const index = analysis[key].findIndex((v) => v.name === record.name);
      if (index === -1) {
        analysis[key].push({
          ...record,
          playCount: 1
        });
      } else {
        analysis[key][index].playCount += 1;
        analysis[key][index].secondsPlayed += record.secondsPlayed;
      }
    }

    for await (const history of readZipContents(store.get("selectedFile"))) {
      for (const stream of history) {
        if (stream.spotify_track_uri === null) {
          continue;
        }

        const seconds = stream.ms_played / 1000;
        pushRecord("albums", {
          name: `${stream.master_metadata_album_album_name!} - ${stream.master_metadata_album_artist_name!}`,
          secondsPlayed: seconds
        });
        pushRecord("artists", {
          name: stream.master_metadata_album_artist_name!,
          secondsPlayed: seconds
        });
        pushRecord("platforms", {
          name: stream.platform.startsWith("Partner")
            ? "TV, Console, etc."
            : stream.platform.toLowerCase().split(" ")[0],
          secondsPlayed: seconds
        });
        pushRecord("songs", {
          name: `${stream.master_metadata_track_name!} - ${stream.master_metadata_album_artist_name!}`,
          secondsPlayed: seconds
        });
      }
    }

    for (const stat in analysis) {
      const list = analysis[stat] as AnalysisSection[];
      analysis[stat] = list.sort((a, b) => b.secondsPlayed - a.secondsPlayed).slice(0, 10);
    }

    mainWindow.webContents.send("analyzer-done", analysis);
  }
};

export function registerCallbacks(mainWindow: BrowserWindow) {
  ipcMain.on("_call", async (_, args) => {
    const callback = callbacks[args.method];
    if (!callback) {
      console.error("Callback not registered: " + args.method);
      return;
    }
    mainWindow.webContents.send(`${args.method}-resp`, await callback(args));
  });

  for (const task in tasks) {
    ipcMain.on(`start-${task}`, async () => {
      await tasks[task](mainWindow);
    });
  }
}
