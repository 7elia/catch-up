<template>
  <main v-if="dataLoaded" class="layout">
    <Navbar />
    <div class="container-layout">
      <ZipSelector />
      <div class="box-container">
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
import {
  getStartupData,
  setScrobbleLimit,
  setRunOnStartup,
  getLastScrobbled,
  startTask
} from "../client-communication";
import Slider from "@vueform/slider";
import Navbar from "../components/Navbar.vue";
import ZipSelector from "../components/ZipSelector.vue";
import store from "../store";

export default {
  components: {
    Slider,
    Navbar,
    ZipSelector
  },
  data() {
    return {
      selectedFile: store.selectedFile,
      scannedSongs: 0,
      initialScannedSongs: 0,
      scrobbledSongs: 0,
      scrobbleLimit: 2500,
      progress: 0,
      runOnStartup: false,
      canScrobble: false,
      dataLoaded: false
    };
  },
  unmounted() {
    window.electron.ipcRenderer.removeAllListeners("update-scanned-songs");
    window.electron.ipcRenderer.removeAllListeners("update-scrobbled-songs");
  },
  async mounted() {
    window.electron.ipcRenderer.on("update-scanned-songs", (_, args: { scannedSongs: number }) => {
      this.scannedSongs = args.scannedSongs;
      if (this.scannedSongs > this.initialScannedSongs) {
        // this is just a client side thing
        this.initialScannedSongs = this.scannedSongs;
      }
    });
    window.electron.ipcRenderer.on(
      "update-scrobbled-songs",
      (_, args: { scrobbledSongs: number }) => {
        this.scrobbledSongs = args.scrobbledSongs;
        this.updateProgress();
      }
    );

    await this.initStartupData();
    await this.startScrobbleCountdown();

    this.updateProgress();
    this.dataLoaded = true;
  },
  methods: {
    async initStartupData() {
      const startupData = await getStartupData();
      this.scannedSongs = startupData.scannedSongs;
      this.initialScannedSongs = startupData.initialScannedSongs;
      this.scrobbledSongs = startupData.scrobbledSongs;
      this.scrobbleLimit = startupData.scrobbleLimit;
      this.runOnStartup = startupData.runOnStartup;
    },
    async startScrobbling() {
      if (!this.canScrobble) {
        return;
      }
      startTask("scrobbler");
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
