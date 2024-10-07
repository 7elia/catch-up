import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import windowStateKeeper from "electron-window-state";
import { getAuthUrl, getSession, createToken, scrobble } from "./lastfm";
import { configDotenv } from "dotenv";
import { Conf } from "electron-conf/main";
import { registerCallbacks } from "./server-communication";
import JSZip from "jszip";
import { SpotifyStream, Stream } from "../common/types";
import { readFile } from "fs";
import { expand } from "dotenv-expand";

export const store = new Conf<{
  token: string;
  key: string;
  scrobbledSongs: number;
  selectedFile: string;
  initialScannedSongs: number;
  remainingSongs: Stream[];
  scrobbleLimit: number;
  lastScrobbled: Date;
}>();

function createWindow(): BrowserWindow {
  expand(
    configDotenv({
      path: join(__dirname, "../../resources/.env")
    })
  );

  const minWidth = 720;
  const minHeight = 850;

  const windowState = windowStateKeeper({
    defaultWidth: minWidth,
    defaultHeight: minHeight,
    maximize: false
  });

  const mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    minWidth,
    minHeight,
    x: windowState.x,
    y: windowState.y,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  windowState.manage(mainWindow);

  mainWindow.on("ready-to-show", () => {
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
    if (is.dev) {
      mainWindow.webContents.openDevTools();
      console.log("Config path: " + app.getPath("userData"));
    }
  });

  mainWindow.webContents.on("will-navigate", (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  let mainWindow = createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });

  registerCallbacks(mainWindow);

  ipcMain.on("auth-start", async () => {
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
  });

  ipcMain.on("select-zip-start", async () => {
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

      readFile(result.filePaths[0], async (err, data) => {
        if (err) {
          throw err;
        }
        const results = await JSZip.loadAsync(data);
        results.forEach(async (relativePath, file) => {
          if (
            relativePath.includes("Streaming_History_") &&
            relativePath.endsWith(".json") &&
            !file.dir
          ) {
            const history: SpotifyStream[] = JSON.parse(await file.async("string"));
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
        });
      });
    }

    mainWindow.webContents.send("select-zip-done", {
      canceled: result.canceled,
      filePath: result.filePaths.length > 0 ? result.filePaths[0] : null,
      scannedSongs: scannedSongs.length
    });
  });

  ipcMain.on("start-scrobbling", async () => {
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
    store.set("lastScrobbled", new Date());
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
