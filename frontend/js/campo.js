/* Field Shift — selección del campo en el mapa (Leaflet). */
(function () {
  // Centro por defecto: Corredor Seco Centroamericano (Guatemala).
  const DEFAULT = { lat: 14.8, lon: -90.5 };
  const saved = FSStore.getField();
  const start = saved ? { lat: saved.latitude, lon: saved.longitude } : DEFAULT;

  const map = L.map("map").setView([start.lat, start.lon], saved ? 11 : 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  let marker = null;
  const coordsEl = document.getElementById("coords");

  function place(lat, lon) {
    const latf = +lat.toFixed(4), lonf = +lon.toFixed(4);
    if (!marker) {
      marker = L.marker([latf, lonf], { draggable: true }).addTo(map);
      marker.on("dragend", (e) => {
        const p = e.target.getLatLng();
        place(p.lat, p.lng);
      });
    } else {
      marker.setLatLng([latf, lonf]);
    }
    coordsEl.textContent = `${latf}, ${lonf}`;
    FSStore.setField({ latitude: latf, longitude: lonf });
  }

  if (saved) place(saved.latitude, saved.longitude);
  map.on("click", (e) => place(e.latlng.lat, e.latlng.lng));
})();
