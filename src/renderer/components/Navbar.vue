<template>
  <nav class="navbar">
    <button class="navbar-user button-secondary">
      <!-- eslint-disable-next-line prettier/prettier -->
      <img class="navbar-pfp" :src="!user || user?.image.length === 0 ? `https://lastfm.freetls.fastly.net/i/u/avatar42s/818148bf682d429dc215c1705eb27b98.png` : user?.image[3].url" />
      {{ !user ? "Loading..." : user?.name }}
    </button>
    <div class="navbar-routes">
      <template v-for="route in $router.getRoutes()" :key="route.path">
        <button
          v-if="!route.meta.hidden"
          class="button-secondary"
          :style="{
            'text-decoration':
              $router.currentRoute.value.path === route.path ? 'underline dotted' : ''
          }"
          @click="() => $router.push(route.path)"
        >
          {{ route.name }}
        </button>
      </template>
    </div>
    <button class="navbar-logout button-secondary" @click="logout">Logout</button>
  </nav>
</template>
<script lang="ts">
import { getAuthenticatedUser, logout } from "../client-communication";
import store from "../store";

export default {
  data() {
    return {
      user: store.user
    };
  },
  async mounted() {
    const user = await getAuthenticatedUser();
    if (!user) {
      this.$router.push("/login");
      return;
    }
    store.user = user;
  },
  methods: {
    logout() {
      logout();
      this.$router.push("/login");
    }
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
  justify-content: space-between;
}

.navbar button {
  width: 120px;
}

.navbar * {
  vertical-align: middle;
  height: 80%;
  margin-top: 0.5ch;
}

.navbar-user {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 1.5rem;
  gap: 0.7rem;
}

.navbar-pfp {
  height: 100%;
  border-radius: 100%;
  margin: 0;
  user-select: none;
  -webkit-user-drag: none;
}

.navbar-routes {
  display: flex;
  gap: 10px;
}

.navbar-routes * {
  height: 100%;
  margin: 0;
}

.navbar-logout {
  margin-right: 1.5rem;
  vertical-align: middle;
}
</style>
