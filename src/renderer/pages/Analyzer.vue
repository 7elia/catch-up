<template>
  <main class="layout">
    <Navbar />
    <div class="container-layout">
      <ZipSelector />
      <template v-if="!!data">
        <AnalysisSection title="Artists" :data="data.artists" />
        <AnalysisSection title="Songs" :data="data.songs" />
        <AnalysisSection title="Albums" :data="data.albums" />
        <AnalysisSection title="Platforms" :data="data.platforms" />
      </template>
      <div class="box-container">
        <button
          class="full-size-button button-secondary"
          :disabled="!canAnalyze"
          @click="startAnalysis"
        >
          <p id="start-scrobble-text">Analyze</p>
        </button>
      </div>
    </div>
  </main>
</template>
<script lang="ts">
import { AnalysisData } from "src/common/types";
import { startTask } from "../client-communication";
import Navbar from "../components/Navbar.vue";
import ZipSelector from "../components/ZipSelector.vue";
import AnalysisSection from "../components/AnalysisSection.vue";

export default {
  components: {
    Navbar,
    ZipSelector,
    AnalysisSection
  },
  data() {
    return {
      dataLoaded: false,
      canAnalyze: true,
      data: undefined as AnalysisData | undefined
    };
  },
  methods: {
    startAnalysis() {
      if (!this.canAnalyze) {
        return;
      }
      window.electron.ipcRenderer.once("analyzer-done", (_, data: AnalysisData) => {
        this.data = data;
        console.log(data);
      });
      startTask("analyzer");
      this.canAnalyze = false;
    }
  }
};
</script>
