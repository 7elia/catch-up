<template>
  <div class="box-container">
    <button class="full-size-button button-secondary" @click="selectFile">Select .zip File</button>
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
      selectedFile: store.selectedFile
    };
  },
  async mounted() {
    if (!store.selectedFile) {
      store.selectedFile = await getSelectedFile();
    }
  },
  methods: {
    selectFile() {
      window.electron.ipcRenderer.once("select-zip-done", (_, data: SelectZipResult) => {
        if (!data.canceled) {
          store.selectedFile = data.filePath;
        }
      });
      startTask("selectZip");
    },
    async openSelectedFile() {
      if (this.selectedFile) {
        await focusFile(this.selectedFile);
      }
    }
  }
};
</script>
