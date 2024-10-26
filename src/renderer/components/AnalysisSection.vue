<template>
  <div class="box-container">
    <h2>{{ title }}</h2>
    <div class="analysis-grid">
      <template v-for="(item, index) in data" :key="index">
        <code>{{ index + 1 }}.</code>
        <div>{{ (item as AnalysisSection).name }}</div>
        <div>{{ (item as AnalysisSection).playCount }} Plays</div>
        <div>{{ ((item as AnalysisSection).secondsPlayed / 60 / 60).toFixed(2) }} Hours</div>
      </template>
    </div>
  </div>
</template>
<script lang="ts">
import { AnalysisSection } from "src/common/types";

export default {
  props: {
    title: {
      type: String,
      required: true
    },
    data: {
      type: Array,
      required: true
    }
  }
};
</script>
<style>
.analysis-grid {
  display: grid;
  grid-template-columns: 0.6fr 3fr 2fr 2fr;
  gap: 10px;
  text-align: center;
}

.analysis-grid > div {
  display: flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  border: 2px solid var(--color-background);
  border-radius: 7px;
}
</style>
