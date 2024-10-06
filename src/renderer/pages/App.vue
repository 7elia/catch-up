<template>
  <RouterView />
</template>
<script lang="ts">
import { isAuthenticated } from "../client-communication";

export default {
  async mounted() {
    if (!(await isAuthenticated())) {
      this.$router.push("/login");
    }
  }
};
</script>
