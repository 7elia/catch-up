import md5 from "md5";
import { store } from ".";
import { UserResponse, SessionResponse, Stream } from "../common/types";

async function createRequest<T>(
  method: string,
  params: Record<string, unknown> = {},
  reqMethod: string = "GET"
): Promise<T> {
  const base = "http://ws.audioscrobbler.com/2.0/";
  const urlParams = new URLSearchParams({
    ...params,
    method,
    api_key: process.env.LASTFM_KEY as string,
    format: "json"
  });
  urlParams.append("api_sig", getSignature(urlParams));
  return await (await fetch(`${base}?${urlParams.toString()}`, { method: reqMethod })).json();
}

async function createSessionRequest<T>(
  method: string,
  params: Record<string, unknown> = {},
  reqMethod: string = "GET"
): Promise<T> {
  if (!store.has("key")) {
    throw new Error("Tried creating session request without being authenticated.");
  }
  return await createRequest(
    method,
    {
      sk: store.get("key"),
      ...params
    },
    reqMethod
  );
}

function getSignature(params: URLSearchParams): string {
  let signature = "";
  const keys = Array.from(params.keys());
  keys.sort();
  for (const key of keys) {
    signature += key + params.get(key);
  }
  return md5(signature + process.env.LASTFM_SECRET);
}

export async function createToken(): Promise<string> {
  const token = (await createRequest<{ token: string }>("auth.getToken")).token;
  setTimeout(
    () => {
      if (store.get("token") === token) {
        store.delete("token");
      }
    },
    59 * 60 * 1000
  );
  return token;
}

export async function getAuthUrl(): Promise<string> {
  if (!store.has("token")) {
    store.set("token", await createToken());
  }
  return `https://last.fm/api/auth/?api_key=${process.env.LASTFM_KEY}&token=${store.get("token")}`;
}

export async function getSession(): Promise<SessionResponse> {
  if (!store.has("token")) {
    store.set("token", await createToken());
  }
  return (
    await createRequest<{ session: SessionResponse }>("auth.getSession", {
      token: store.get("token")
    })
  ).session;
}

let cache: UserResponse;
export async function getAuthenticatedUser(): Promise<UserResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await createSessionRequest<{ user: any }>("user.getInfo")).user;
  return !cache
    ? (cache = {
        ...data,
        age: Number(data.age),
        album_count: Number(data.album_count),
        artist_count: Number(data.artist_count),
        bootstrap: Number(data.bootstrap),
        image: data.image
          .filter((v: { "#text": string; size: string }) => v["#text"] !== "")
          .map((v: { "#text": string; size: string }) => {
            return {
              url: v["#text"],
              size: v.size
            };
          }),
        playcount: Number(data.playcount),
        playlists: Number(data.playlists),
        registered: new Date(data.registered["#text"] * 1000),
        subscriber: Number(data.subscriber),
        track_count: Number(data.track_count)
      })
    : cache;
}

export async function scrobble(streams: Stream[]) {
  const params = {};
  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    params[`artist[${i}]`] = stream.artist;
    params[`albumArtist[${i}]`] = stream.artist;
    params[`track[${i}]`] = stream.name;
    params[`timestamp[${i}]`] = Math.floor(new Date().getTime() / 1000);
    params[`album[${i}]`] = stream.album;
  }
  const sorted = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {});
  await createSessionRequest("track.scrobble", sorted, "POST");
}
