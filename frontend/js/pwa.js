/* Field Shift — registro del service worker + indicador sin conexión. */
(function () {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  function updateOnline() {
    document.body.classList.toggle("offline", !navigator.onLine);
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  document.addEventListener("DOMContentLoaded", updateOnline);
})();
