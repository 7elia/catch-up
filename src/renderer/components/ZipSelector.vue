<template>
  <div class="box-container">
    <button
      class="full-size-button button-secondary"
      :disabled="loading"
      @click="startTask('selectZip')"
    >
      Select .zip File
    </button>
    <p>
      <b>Selected File: </b>
      <a v-if="selectedFile" style="cursor: pointer" @click="openSelectedFile">
        <code>{{ selectedFile }}</code>
      </a>
      <code v-else>None</code>
    </p>
  </div>
</template>
<script lang="ts">
import { SelectZipResult } from "src/common/types";
import { focusFile, getSelectedFile, startTask } from "../client-communication";
import store from "../store";

export default {
  data() {
    return {
      selectedFile: store.selectedFile,
      loading: false
    };
  },
  async mounted() {
    window.electron.ipcRenderer.on("select-zip-start", () => {
      this.loading = true;
    });
    window.electron.ipcRenderer.on("select-zip-done", (_, data: SelectZipResult) => {
      if (!data.canceled) {
        this.selectedFile = store.selectedFile = data.filePath;
      }
      this.loading = false;
    });

    if (!store.selectedFile) {
      this.selectedFile = store.selectedFile = await getSelectedFile();
    }
  },
  methods: {
    async openSelectedFile() {
      if (this.selectedFile) {
        await focusFile(this.selectedFile);
      }
    },
    startTask
  }
};
</script>
