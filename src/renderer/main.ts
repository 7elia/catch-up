import "./styles/main.css";
import "@vueform/slider/themes/default.css";

import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import App from "./pages/App.vue";
import Home from "./pages/Home.vue";
import Login from "./pages/Login.vue";

const router = createRouter({
  routes: [
    {
      path: "/",
      component: Home
    },
    {
      path: "/login",
      component: Login
    }
  ],
  history: createMemoryHistory()
});

createApp(App).use(router).mount("#app");
