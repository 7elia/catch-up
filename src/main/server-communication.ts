import { app, BrowserWindow, ipcMain, shell } from "electron";
import { store } from ".";
import { getAuthenticatedUser } from "./lastfm";
import { StartupData, UserResponse } from "../common/types";
import { electronApp, platform } from "@electron-toolkit/utils";

const callbacks = {
  isAuthenticated() {
    return store.has("key");
  },
  async getAuthenticatedUser(): Promise<UserResponse> {
    return await getAuthenticatedUser();
  },
  getConfigPath() {
    return app.getPath("userData");
  },
  logout() {
    store.clear();
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
      selectedFile: store.get("selectedFile"),
      runOnStartup: platform.isLinux ? false : app.getLoginItemSettings().openAtLogin
    };
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

export function registerCallbacks(mainWindow: BrowserWindow) {
  ipcMain.on("_call", async (_, args) => {
    const callback = callbacks[args.method];
    if (!callback) {
      console.error("Callback not registered: " + args.method);
      return;
    }
    mainWindow.webContents.send(`${args.method}-resp`, await callback(args));
  });
}
