<template>
  <RouterView />
</template>
<script lang="ts">
import { isAuthenticated } from "../client-communication";

export default {
  async mounted() {
    this.$router.push((await isAuthenticated()) ? "/scrobbler" : "/login");
  }
};
</script>
