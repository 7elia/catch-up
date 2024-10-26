import { readFile } from "fs/promises";
import JSZip from "jszip";
import { SpotifyStream } from "../common/types";

export async function* readZipContents(filePath: string): AsyncGenerator<SpotifyStream[]> {
  const data = await readFile(filePath);
  const zip = await JSZip.loadAsync(data);
  for (const relativePath in zip.files) {
    const file = zip.files[relativePath];
    if (
      !file.dir &&
      relativePath.includes("Streaming_History_") &&
      relativePath.endsWith(".json")
    ) {
      yield JSON.parse(await file.async("string"));
    }
  }
}
