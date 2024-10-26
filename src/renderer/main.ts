import "./styles/main.css";
import "@vueform/slider/themes/default.css";

import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import App from "./pages/App.vue";
import Login from "./pages/Login.vue";
import Scrobbler from "./pages/Scrobbler.vue";
import Analyzer from "./pages/Analyzer.vue";

const router = createRouter({
  routes: [
    {
      path: "/scrobbler",
      component: Scrobbler,
      name: "Scrobbler"
    },
    {
      path: "/analyzer",
      component: Analyzer,
      name: "Analyzer"
    },
    {
      path: "/login",
      component: Login,
      name: "Login",
      meta: {
        hidden: true
      }
    }
  ],
  history: createMemoryHistory()
});

createApp(App).use(router).mount("#app");
