<template>
  <main v-if="dataLoaded" class="layout">
    <nav class="navbar">
      <div class="navbar-user">
        <!-- eslint-disable-next-line prettier/prettier -->
        <img class="navbar-pfp" :src="user?.image.length === 0 ? `https://lastfm.freetls.fastly.net/i/u/avatar42s/818148bf682d429dc215c1705eb27b98.png` : user?.image[3].url" />
        <a class="navbar-username" :href="user?.url">{{ user?.name }}</a>
      </div>
      <button class="navbar-logout button-secondary" @click="logout">Logout</button>
    </nav>
    <div class="container-layout">
      <div class="box-container">
        <button class="full-size-button button-secondary" @click="selectFile">
          Select .zip File
        </button>
      </div>
      <div class="box-container">
        <p>
          <b>Selected File: </b>
          <a v-if="selectedFile" style="cursor: pointer" @click="openSelectedFile">
            <code>{{ selectedFile }}</code>
          </a>
          <code v-else>None</code>
        </p>
        <p>
          <b>Songs Left: </b>
          <code>
            {{ scannedSongs === 0 ? "None" : scannedSongs }}
            {{
              initialScannedSongs === 0 || initialScannedSongs == scannedSongs
                ? ""
                : ` (Initially ${initialScannedSongs})`
            }}
          </code>
        </p>
        <p>
          <b>Estimated Time Left: </b>
          <code>{{
            scannedSongs === 0 ? "None" : `${Math.ceil(scannedSongs / scrobbleLimit)} Days`
          }}</code>
        </p>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: `${Math.max(5, progress || 0)}%` }">
            <p class="progress-text">{{ progress }}%</p>
          </div>
        </div>
      </div>
      <div class="box-container">
        <p>
          <b>Run On Startup:</b>
          <input
            class="run-on-startup"
            type="checkbox"
            :checked="runOnStartup"
            @change="(e) => setRunOnStartup((e.target as HTMLInputElement).checked)"
          />
        </p>
        <div>
          <b>Daily Scrobble Limit:</b>
          <div class="scrobble-limit-container">
            <Slider
              v-model="scrobbleLimit"
              :min="50"
              :max="2800"
              :tooltips="false"
              :lazy="false"
              :step="50"
              class="scrobble-limit"
              @change="() => setScrobbleLimit(scrobbleLimit)"
            />
            <code :class="{ danger: scrobbleLimit > 2500 }">
              {{ scrobbleLimit }} ({{ Math.floor(scrobbleLimit / 50) }} Batches)
            </code>
          </div>
        </div>
        <code class="danger">
          The daily scrobble limit for Last.FM is 2800, which means that if you exceed this the rest
          of your scrobbles won't be saved, even for the songs you're listening to casually. Last.FM
          {{
            scrobbleLimit === 2800
              ? `won't save any more scrobbles`
              : `will only save ${2800 - scrobbleLimit} more scrobble${scrobbleLimit === 1 ? "" : "s"}`
          }}
          today.
        </code>
      </div>
      <div class="box-container">
        <button
          class="full-size-button button-secondary"
          :disabled="!canScrobble"
          @click="startScrobbling"
        >
          <p id="start-scrobble-text">Loading...</p>
        </button>
      </div>
    </div>
  </main>
</template>
<script lang="ts">
import { SelectZipResult, UserResponse } from "src/common/types";
import {
  focusFile,
  getAuthenticatedUser,
  getStartupData,
  logout,
  setScrobbleLimit,
  setRunOnStartup,
  getLastScrobbled
} from "../client-communication";
import Slider from "@vueform/slider";

export default {
  components: {
    Slider
  },
  data() {
    return {
      selectedFile: undefined as string | undefined,
      scannedSongs: 0,
      initialScannedSongs: 0,
      scrobbledSongs: 0,
      scrobbleLimit: 2500,
      progress: 0,
      runOnStartup: false,
      canScrobble: false,
      dataLoaded: false,
      user: undefined as UserResponse | undefined
    };
  },
  unmounted() {
    window.electron.ipcRenderer.removeAllListeners("update-scanned-songs");
    window.electron.ipcRenderer.removeAllListeners("update-scrobbled-songs");
  },
  async mounted() {
    window.electron.ipcRenderer.on("update-scanned-songs", (_, args: { scannedSongs: number }) => {
      this.scannedSongs = args.scannedSongs;
    });
    window.electron.ipcRenderer.on(
      "update-scrobbled-songs",
      (_, args: { scrobbledSongs: number }) => {
        this.scrobbledSongs = args.scrobbledSongs;
        this.updateProgress();
      }
    );

    const user = await getAuthenticatedUser();
    if (!user) {
      this.$router.push("/login");
      return;
    }
    this.user = user;
    await this.initStartupData();
    await this.startScrobbleCountdown();

    this.updateProgress();
    this.dataLoaded = true;
  },
  methods: {
    async initStartupData() {
      const startupData = await getStartupData();
      this.selectedFile = startupData.selectedFile;
      this.scannedSongs = startupData.scannedSongs;
      this.initialScannedSongs = startupData.initialScannedSongs;
      this.scrobbledSongs = startupData.scrobbledSongs;
      this.scrobbleLimit = startupData.scrobbleLimit;
      this.runOnStartup = startupData.runOnStartup;
    },
    logout() {
      logout();
      this.$router.push("/login");
    },
    selectFile() {
      window.electron.ipcRenderer.once("select-zip-done", (_, data: SelectZipResult) => {
        if (!data.canceled) {
          this.initStartupData();
        }
      });
      this.initialScannedSongs = 0;
      window.electron.ipcRenderer.send("select-zip-start");
    },
    async openSelectedFile() {
      if (this.selectedFile) {
        await focusFile(this.selectedFile);
      }
    },
    async startScrobbling() {
      if (!this.canScrobble) {
        return;
      }
      window.electron.ipcRenderer.send("start-scrobbling");
      this.updateProgress();
      this.canScrobble = false;
      await this.startScrobbleCountdown();
    },
    updateProgress() {
      this.scannedSongs = this.initialScannedSongs - this.scrobbledSongs;
      this.progress =
        this.initialScannedSongs === 0 || this.scrobbledSongs === 0
          ? 0
          : Math.round((this.scrobbledSongs / this.initialScannedSongs) * 100);
    },
    async startScrobbleCountdown() {
      const lastScrobbleTime = await getLastScrobbled();
      const targetTime = !lastScrobbleTime
        ? new Date()
        : new Date(lastScrobbleTime.getTime() + 24 * 60 * 60 * 1000);
      const interval = setInterval(() => {
        const element = document.getElementById("start-scrobble-text");
        if (!element) {
          return;
        }
        const now = new Date();
        const remainingTime = targetTime.getTime() - now.getTime();

        if (remainingTime <= 0) {
          element.innerText = "Scrobble Today's Limit";
          this.canScrobble = true;
          clearInterval(interval);
          return;
        }

        const hours = Math.floor(
          (remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ).toString();
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60)).toString();
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000).toString();

        element.innerHTML = `Scrobble Again In: ${hours.length === 1 ? "0" : ""}${hours}:${minutes.length === 1 ? "0" : ""}${minutes}:${seconds.length === 1 ? "0" : ""}${seconds}`;
      }, 1000);
      this.$router.beforeResolve(() => {
        clearInterval(interval);
      });
    },
    setScrobbleLimit,
    setRunOnStartup
  }
};
</script>
<style scoped>
.navbar {
  width: 100vw;
  height: 2.6rem;
  background-color: var(--color-foreground);
  display: flex;
  flex-direction: row;
  vertical-align: middle;
  justify-content: space-between;
}

.navbar-user {
  display: flex;
  align-items: center;
  vertical-align: middle;
  height: 100%;
  margin-left: 1.5rem;
  gap: 0.7rem;
}

.navbar-pfp {
  height: 80%;
  border-radius: 100%;
  user-select: none;
  -webkit-user-drag: none;
}

.navbar-logout {
  height: 80%;
  margin-right: 1.5rem;
  margin-top: 0.5ch;
  vertical-align: middle;
}

.layout,
.container-layout {
  display: flex;
  flex-direction: column;
}

.layout {
  width: 100%;
  justify-content: center;
  align-items: center;
}

.container-layout {
  width: 60%;
  margin: 2rem auto 0 auto;
  gap: 2rem;
}

.box-container {
  background-color: var(--color-foreground);
  padding: 1.5rem;
  border-radius: 10px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.full-size-button {
  height: calc(2.6rem * 0.8);
  width: 100%;
}

.run-on-startup {
  margin-left: 6px;
}

.scrobble-limit-container {
  display: flex;
  flex-direction: row;
  font-size: 80%;
  gap: 18px;
  align-items: center;
}

.scrobble-limit-container code {
  width: min-content;
  text-wrap: nowrap;
}

.scrobble-limit {
  width: 100%;
}

.progress-bar-container {
  width: 100%;
  background-color: var(--color-text);
  border-radius: 10px;
}

.progress-bar {
  background-color: var(--color-background);
  display: flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  height: calc(2.6rem * 0.8);
}

.progress-text {
  font-size: 70%;
}

.danger {
  color: crimson;
}
</style>
