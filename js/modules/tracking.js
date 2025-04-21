// tracking.js
// Modular GPS tracking logic with support for points, lines, polygons, exports, and stats

export function initTrackingModule(map) {
  // ─────────────────────────────────────
  // Internal State
  // ─────────────────────────────────────
  let tracking = false, gpsWatcher = null, timerInterval = null;
  let startTime = null, lastLatLng = null, lastTimestamp = null;
  let totalDistance = 0, minAccuracy = null, maxAccuracy = null;

  let trackPoints = [];
  let trackLines = [], currentLine = null;
  let trackPolygons = [], currentPolygon = null;

  // ─────────────────────────────────────
  // Accessors to query UI state
  // ─────────────────────────────────────
  const ui = {
    getLabel: () => document.getElementById("pointLabel")?.value || "Label",
    getMode: () => document.getElementById("captureMode")?.value || "distance",
    getParam: () => parseFloat(document.getElementById("captureParam")?.value || "10"),
    usePoints: () => document.getElementById("enablePoints")?.checked,
    useLine: () => document.getElementById("enableLine")?.checked,
    usePolygon: () => document.getElementById("enablePolygon")?.checked,
    updateStats: updateStats
  };

  // ─────────────────────────────────────
  // Start Tracking
  // ─────────────────────────────────────
  function start() {
    tracking = true;
    startTime = Date.now();
    lastLatLng = null;
    lastTimestamp = null;
    totalDistance = 0;
    minAccuracy = null;
    maxAccuracy = null;

    currentLine = L.polyline([], { color: 'red', weight: 1 }).addTo(map);
    currentPolygon = L.polygon([], { color: 'green', weight: 1, fillOpacity: 0.1 }).addTo(map);

    trackLines.push(currentLine);
    trackPolygons.push(currentPolygon);

    timerInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      ui.updateStats({ elapsed, totalDistance, trackPoints, currentLine, currentPolygon, minAccuracy, maxAccuracy });
    }, 1000);

    gpsWatcher = navigator.geolocation.watchPosition(onGPSUpdate, onGPSError, {
      enableHighAccuracy: true,
      maximumAge: 1000
    });
  }

  // ─────────────────────────────────────
  // Stop Tracking
  // ─────────────────────────────────────
  function stop() {
    tracking = false;
    clearInterval(timerInterval);
    navigator.geolocation.clearWatch(gpsWatcher);
  }

  // ─────────────────────────────────────
  // GPS Position Handler
  // ─────────────────────────────────────
  function onGPSUpdate(pos) {
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    const now = Date.now();
    const latlng = L.latLng(lat, lon);

    const label = ui.getLabel();
    const mode = ui.getMode();
    const param = ui.getParam();
    const usePoints = ui.usePoints();
    const useLine = ui.useLine();
    const usePolygon = ui.usePolygon();

    if (minAccuracy === null || accuracy < minAccuracy) minAccuracy = accuracy;
    if (maxAccuracy === null || accuracy > maxAccuracy) maxAccuracy = accuracy;

    const distance = lastLatLng ? latlng.distanceTo(lastLatLng) : null;
    const elapsed = lastTimestamp ? (now - lastTimestamp) / 1000 : null;
    const shouldLog = !lastLatLng ||
      (mode === "distance" && distance >= param) ||
      (mode === "time" && elapsed >= param);

    if (shouldLog) {
      // Save point feature
      trackPoints.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { label, accuracy, timestamp: new Date(now).toISOString() }
      });

      // Draw on map
      if (usePoints) {
        L.circleMarker(latlng, { radius: 2, color: 'blue', fillOpacity: 0.6 }).addTo(map);
      }
      if (useLine) {
        currentLine.addLatLng(latlng);
      }
      if (usePolygon) {
        const latlngs = currentPolygon.getLatLngs()[0] || [];
        latlngs.push(latlng);
        currentPolygon.setLatLngs([latlngs]);
      }

      if (distance) totalDistance += distance;
      lastLatLng = latlng;
      lastTimestamp = now;
    }
  }

  function onGPSError(err) {
    alert("GPS Error: " + err.message);
  }

  // ─────────────────────────────────────
  // Export Geometry as GeoJSON
  // ─────────────────────────────────────
  function exportGeo(type) {
    const features = [];

    if (type === "points") {
      features.push(...trackPoints);
    }

    if (type === "lines") {
      trackLines.forEach(line => {
        const coords = line.getLatLngs().map(ll => [ll.lng, ll.lat]);
        if (coords.length >= 2) {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {}
          });
        }
      });
    }

    if (type === "polygons") {
      trackPolygons.forEach(poly => {
        const latlngs = poly.getLatLngs()[0] || [];
        if (latlngs.length >= 3) {
          const coords = latlngs.map(ll => [ll.lng, ll.lat]);
          coords.push(coords[0]); // Close the polygon
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties: {}
          });
        }
      });
    }

    const geojson = { type: "FeatureCollection", features };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_${new Date().toISOString()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────
  // Stats Rendering
  // ─────────────────────────────────────
  function updateStats({ elapsed, totalDistance, trackPoints, currentLine, currentPolygon, minAccuracy, maxAccuracy }) {
    const polygonLatLngs = currentPolygon?.getLatLngs()[0] || [];

    document.getElementById("elapsedTime").textContent = `${Math.floor(elapsed)}s`;
    document.getElementById("totalDistance").textContent = totalDistance.toFixed(1);
    document.getElementById("pointCount").textContent = trackPoints.length;
    document.getElementById("lineVertices").textContent = currentLine?.getLatLngs().length || 0;
    document.getElementById("polygonVertices").textContent = polygonLatLngs.length;
    document.getElementById("minAccuracy").textContent = minAccuracy !== null ? minAccuracy.toFixed(1) : "—";
    document.getElementById("maxAccuracy").textContent = maxAccuracy !== null ? maxAccuracy.toFixed(1) : "—";

    // Area (geodesic approximation)
    const area = polygonLatLngs.length >= 3 ? L.GeometryUtil.geodesicArea(polygonLatLngs) : 0;
    document.getElementById("totalArea").textContent = area.toFixed(1);
  }

  // ─────────────────────────────────────
  // Return Public API
  // ─────────────────────────────────────
  return {
    start,
    stop,
    exportGeo,
    resetStats: () => { startTime = Date.now(); }
  };
}