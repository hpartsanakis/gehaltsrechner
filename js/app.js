document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("app-ready");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.error("App konnte nicht offline vorbereitet werden.", error);
    });
  });
}
