<template>
  <main class="layout">
    <div class="container">
      <h1 class="title">Catch Up™️</h1>
      <button class="login" @click="login">
        Log in with
        <img
          class="login-logo"
          src="https://www.last.fm/static/images/logo_static.adb61955725c.png"
        />
      </button>
    </div>
  </main>
</template>
<script lang="ts">
import { isAuthenticated, startTask } from "../client-communication";

export default {
  methods: {
    login() {
      window.electron.ipcRenderer.once("auth-done", async () => {
        if (await isAuthenticated()) {
          await this.$router.push("/scrobbler");
        }
      });
      startTask("auth");
    }
  }
};
</script>
<style scoped>
.layout {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  margin-bottom: 30px;
}

.login {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 120%;
  height: 50px;
}

.login-logo {
  padding-left: 6px;
  margin-bottom: 1px;
  filter: drop-shadow(0 0 0.4rem red);
  width: 75px;
}

.title {
  font-weight: 700;
  font-size: 340%;
  filter: drop-shadow(0 0 0.5rem var(--color-text-shadow));
}
</style>
