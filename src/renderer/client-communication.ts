import { StartupData, UserResponse } from "src/common/types";

function callMethod<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error(`Method timed out: ${method}`);
      reject();
    }, 10000);
    window.electron.ipcRenderer.once(`${method}-resp`, (_, data) => {
      clearTimeout(timeout);
      resolve(data as T);
    });
    window.electron.ipcRenderer.send("_call", {
      method,
      ...args
    });
  });
}

export async function isAuthenticated(): Promise<boolean> {
  return await callMethod("isAuthenticated");
}

export async function getAuthenticatedUser(): Promise<UserResponse | null> {
  return await callMethod("getAuthenticatedUser");
}

export async function logout() {
  return await callMethod("logout");
}

export async function focusFile(path: string) {
  return await callMethod("focusFile", { path });
}

export async function getStartupData(): Promise<StartupData> {
  return await callMethod("getStartupData");
}

export async function setScrobbleLimit(limit: number) {
  await callMethod("setScrobbleLimit", { limit });
}

export async function setRunOnStartup(value: boolean) {
  await callMethod("setRunOnStartup", { value });
}

export async function getLastScrobbled(): Promise<Date | null> {
  const result = await callMethod("getLastScrobbled");
  return !result ? null : new Date(result as string);
}
