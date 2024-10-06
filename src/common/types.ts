export type SessionResponse = {
  name: string;
  key: string;
  subscriber: number;
};

export type UserResponse = {
  age: number;
  album_count: number;
  artist_count: number;
  bootstrap: number;
  country: string;
  gender: string;
  image: {
    url: string;
    size: string;
  }[];
  name: string;
  playcount: number;
  playlists: number;
  realname: string;
  registered: Date;
  subscriber: number;
  track_count: number;
  type: string;
  url: string;
};

export type SelectZipResult = {
  canceled: boolean;
  filePath?: string;
  scannedSongs: number;
};

export type SpotifyStream = {
  ts: string;
  username: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr_decrypted: string;
  user_agent_decrypted: string;
  master_metadata_track_name?: string;
  master_metadata_album_artist_name?: string;
  master_metadata_album_album_name?: string;
  spotify_track_uri?: string;
  episode_name?: string;
  episode_show_name?: string;
  spotify_episode_uri?: string;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped?: boolean;
  offline: boolean;
  offline_timestamp: string;
  incognito_mode: boolean;
};

export type Stream = {
  date: string;
  name: string;
  album: string;
  artist: string;
};

export type StartupData = {
  selectedFile: string;
  scannedSongs: number;
  initialScannedSongs: number;
  scrobbleLimit: number;
  scrobbledSongs: number;
  runOnStartup: boolean;
};
