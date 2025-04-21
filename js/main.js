// main.js
// Initializes map, live GPS, basemaps, and core modules (user points + tracking)

import { initTrackingModule } from './modules/tracking.js';
import { pointuser } from './modules/pointuser.js';

let map, userMarker, accuracyCircle;
let autoFollow = true;
let currentBasemap;

document.addEventListener("DOMContentLoaded", async () => {
  // ─────────────────────────────────────
  // 1. Initialize Leaflet Map
  // ─────────────────────────────────────
  map = L.map('map').setView([45.0, -63.0], 13);

  // ─────────────────────────────────────
  // 2. Define Available Basemaps
  // ─────────────────────────────────────
  const basemaps = {
    esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20, attribution: '© Esri'
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }),
    google: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20, attribution: '© Google'
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, attribution: '© OpenTopoMap'
    })
  };
  currentBasemap = basemaps.esri.addTo(map);

  // ─────────────────────────────────────
  // 3. Top Drawer Basemap Selector
  // ─────────────────────────────────────
  const toggleBtn = document.getElementById("basemapToggleBtn");
  const drawer = document.getElementById("basemapDrawer");

  if (toggleBtn && drawer) {
    // Toggle drawer on button click
    toggleBtn.onclick = () => {
      drawer.classList.toggle("open");
    };

    // Close drawer on outside click
    document.addEventListener("click", (e) => {
      if (!drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
        drawer.classList.remove("open");
      }
    });

    // Switch basemap when option is clicked
    document.querySelectorAll(".basemap-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const selected = opt.dataset.type;
        if (basemaps[selected]) {
          if (currentBasemap) map.removeLayer(currentBasemap);
          currentBasemap = basemaps[selected].addTo(map);
        }
        drawer.classList.remove("open"); // auto-close
      });
    });
  }

  // ─────────────────────────────────────
  // 4. Load Core Modules
  // ─────────────────────────────────────
  const tracker = initTrackingModule(map);
  setupTrackingButtons(tracker);
  await pointuser.activate(map);

  // ─────────────────────────────────────
  // 5. Setup UI Controls
  // ─────────────────────────────────────
  setupCoreButtons();
  setupPointTypeInputs();

  // ─────────────────────────────────────
  // 6. Start Geolocation Watcher
  // ─────────────────────────────────────
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(handleLocationUpdate, console.error, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
  }
});

// ─────────────────────────────────────
// GPS Location Handling
// ─────────────────────────────────────
function handleLocationUpdate(pos) {
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const acc = pos.coords.accuracy;

  if (!userMarker) {
    userMarker = L.circleMarker([lat, lon], {
      radius: 6, fillColor: "blue", fillOpacity: 0.8,
      color: "#fff", weight: 1
    }).addTo(map);
    accuracyCircle = L.circle([lat, lon], {
      radius: acc, color: "#66f", fillColor: "#66f", fillOpacity: 0.2
    }).addTo(map);
  } else {
    userMarker.setLatLng([lat, lon]);
    accuracyCircle.setLatLng([lat, lon]).setRadius(acc);
  }

  if (autoFollow) map.setView([lat, lon]);

  document.getElementById("gpsHUD").textContent =
    `Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)} | UTM: TBD | Acc: ${acc.toFixed(1)}m`;
}

// ─────────────────────────────────────
// General UI Button Hookups
// ─────────────────────────────────────
function setupCoreButtons() {
  const centerBtn = document.getElementById("centerBtn");
  const autoFollowBtn = document.getElementById("autoFollowBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const dataBtn = document.getElementById("dataLibraryBtn");
  const closeDrawerBtn = document.getElementById("closeUserPointsDrawer");
  const consoleToggle = document.getElementById("toggleConsole");
  const drawerToggle = document.getElementById("drawerToggle");
  const userPointsDrawer = document.getElementById("userPointsDrawer");

  if (userPointsDrawer) userPointsDrawer.classList.add("hidden");

  if (centerBtn) {
    centerBtn.onclick = () => {
      if (userMarker) map.setView(userMarker.getLatLng(), map.getZoom());
    };
  }

  if (autoFollowBtn) {
    autoFollowBtn.onclick = () => {
      autoFollow = !autoFollow;
      alert("Auto-follow: " + (autoFollow ? "On" : "Off"));
    };
  }

  if (settingsBtn) {
    // Reserved for future configuration
  }

  if (dataBtn && userPointsDrawer) {
    dataBtn.onclick = () => {
      userPointsDrawer.classList.toggle("hidden");
    };
  }

  if (closeDrawerBtn && userPointsDrawer) {
    closeDrawerBtn.onclick = () => {
      userPointsDrawer.classList.add("hidden");
    };
  }

  if (consoleToggle) {
    consoleToggle.onclick = () => {
      document.getElementById("userConsole")?.classList.toggle("hidden");
    };
  }

  if (drawerToggle) {
    drawerToggle.onclick = () => {
      document.getElementById("trackingDrawer")?.classList.toggle("closed");
    };
  }
}

// ─────────────────────────────────────
// Tracking Button Actions
// ─────────────────────────────────────
function setupTrackingButtons(tracker) {
  const startBtn = document.getElementById("startStopBtn");
  let trackingActive = false;

  if (startBtn) {
    startBtn.onclick = () => {
      trackingActive = !trackingActive;
      const icon = startBtn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-play", "fa-stop");
        icon.classList.add(trackingActive ? "fa-stop" : "fa-play");
      }
      trackingActive ? tracker.start() : tracker.stop();
    };
  }

  document.getElementById("exportPoints")?.addEventListener("click", () => tracker.exportGeo("points"));
  document.getElementById("exportLine")?.addEventListener("click", () => tracker.exportGeo("lines"));
  document.getElementById("exportPolygon")?.addEventListener("click", () => tracker.exportGeo("polygons"));
  document.getElementById("resetStats")?.addEventListener("click", () => tracker.resetStats());
  document.getElementById("clearAll")?.addEventListener("click", () => location.reload());
}

// ─────────────────────────────────────
// TYPE → SUBTYPE Loader
// ─────────────────────────────────────
function setupPointTypeInputs() {
  const typeSelect = document.getElementById("typeSelector");
  const subtypeSelect = document.getElementById("subtypeSelector");

  if (!typeSelect || !subtypeSelect) return;

  async function loadSubtypes(type) {
  const url = `assets/${type.toLowerCase()}_subtype.csv`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch subtype CSV");

    const csv = await res.text();
    const rows = csv.trim().split(/\r?\n/);  // Fix is here

    subtypeSelect.innerHTML = rows.map(val =>
      `<option value="${val}">${val}</option>`).join("");
  } catch (err) {
    console.error("Subtype CSV loading failed:", err);
    subtypeSelect.innerHTML = `<option>Error loading subtypes</option>`;
  }
}
  typeSelect.addEventListener("change", () => {
    loadSubtypes(typeSelect.value);
  });

  loadSubtypes(typeSelect.value);
}