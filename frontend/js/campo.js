/* Field Shift — sélection de la parcelle : point OU polygone (+ surface). */
(function () {
  const DEFAULT = { lat: 14.8, lon: -90.5 };
  const saved = FSStore.getField();
  const start = saved ? { lat: saved.latitude, lon: saved.longitude } : DEFAULT;

  const map = L.map("map").setView([start.lat, start.lon], saved ? 12 : 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "© OpenStreetMap",
  }).addTo(map);

  const drawn = new L.FeatureGroup().addTo(map);
  const coordsEl = document.getElementById("coords");
  const areaEl = document.getElementById("area");
  let pointMarker = null;

  function showArea(ha) {
    if (ha == null) { areaEl.classList.add("hidden"); return; }
    areaEl.textContent = FSI18N.t("field.area") + " : " + ha.toFixed(2) + " ha";
    areaEl.classList.remove("hidden");
  }

  function savePoint(lat, lon) {
    const la = +lat.toFixed(4), lo = +lon.toFixed(4);
    drawn.clearLayers();
    if (!pointMarker) {
      pointMarker = L.marker([la, lo], { draggable: true }).addTo(map);
      pointMarker.on("dragend", (e) => { const p = e.target.getLatLng(); savePoint(p.lat, p.lng); });
    } else {
      pointMarker.setLatLng([la, lo]);
    }
    coordsEl.textContent = `${la}, ${lo}`;
    showArea(null);
    FSStore.setField({ latitude: la, longitude: lo, area_ha: null, polygon: null });
  }

  function savePolygon(layer) {
    if (pointMarker) { map.removeLayer(pointMarker); pointMarker = null; }
    const latlngs = layer.getLatLngs()[0];
    const c = layer.getBounds().getCenter();
    const ha = L.GeometryUtil.geodesicArea(latlngs) / 10000;
    coordsEl.textContent = `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`;
    showArea(ha);
    FSStore.setField({
      latitude: +c.lat.toFixed(4), longitude: +c.lng.toFixed(4),
      area_ha: +ha.toFixed(2),
      polygon: latlngs.map((p) => [+p.lat.toFixed(5), +p.lng.toFixed(5)]),
    });
  }

  // Outils de dessin (polygone + point).
  map.addControl(new L.Control.Draw({
    position: "topleft",
    draw: { polygon: { shapeOptions: { color: "#2563EB" } }, marker: true,
      polyline: false, rectangle: false, circle: false, circlemarker: false },
    edit: { featureGroup: drawn, edit: false, remove: true },
  }));

  map.on(L.Draw.Event.CREATED, (e) => {
    if (e.layerType === "polygon") { drawn.clearLayers(); drawn.addLayer(e.layer); savePolygon(e.layer); }
    else { const p = e.layer.getLatLng(); savePoint(p.lat, p.lng); }
  });
  map.on(L.Draw.Event.DELETED, () => { FSStore.setField(null); coordsEl.textContent = FSI18N.t("field.none"); showArea(null); });

  // Clic simple = poser/déplacer un point (sélection rapide).
  map.on("click", (e) => savePoint(e.latlng.lat, e.latlng.lng));

  // Restauration de ce qui était enregistré.
  if (saved && saved.polygon && saved.polygon.length) {
    const poly = L.polygon(saved.polygon.map((p) => L.latLng(p[0], p[1])), { color: "#2563EB" });
    drawn.addLayer(poly);
    coordsEl.textContent = `${saved.latitude}, ${saved.longitude}`;
    showArea(saved.area_ha);
  } else if (saved) {
    savePoint(saved.latitude, saved.longitude);
  }

  document.addEventListener("fs:langchange", () => {
    if (saved && saved.area_ha != null) showArea(FSStore.getField() ? FSStore.getField().area_ha : null);
  });
})();
