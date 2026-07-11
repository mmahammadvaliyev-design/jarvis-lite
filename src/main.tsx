import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { getProfile } from "./db";
import "./index.css";

// Создаём профиль по умолчанию один раз при старте (вне рендера),
// чтобы live-запросы в экранах занимались только чтением.
getProfile();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

// Регистрация service worker для офлайна и установки как PWA (только в проде).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* офлайн-режим не критичен */
    });
  });
}
