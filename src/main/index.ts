import { app, shell, BrowserWindow } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import windowStateKeeper from "electron-window-state";
import { configDotenv } from "dotenv";
import { Conf } from "electron-conf/main";
import { registerCallbacks } from "./server-communication";
import { Stream } from "../common/types";
import { expand } from "dotenv-expand";

export const store = new Conf<{
  token: string;
  key: string;
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
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
