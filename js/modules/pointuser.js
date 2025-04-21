// pointuser.js
// Handles collection of user-defined points using GPS or manual placement.
// Each point includes TYPE, SUBTYPE, and DESC from UI inputs, and is saved to IndexedDB for persistence.

import { saveUserPoint, getAllUserPoints, deleteAllUserPoints } from '../db.js';

let mapRef;
let userPointLayer;
let manualMode = false;
let allUserPoints = [];

// Activate user point module
export const pointuser = {
  async activate(map) {
    mapRef = map;

    // Initialize the feature layer if not already
    if (!userPointLayer) userPointLayer = L.featureGroup().addTo(mapRef);
    else mapRef.addLayer(userPointLayer);

    // Setup button click behavior
    setupFloatingButtons();

    // Load previously saved points from IndexedDB
    allUserPoints = await getAllUserPoints();
    renderAllUserPoints();

    logToConsole("✅ User point module activated and loaded");
  },

  deactivate() {
    if (mapRef && userPointLayer) mapRef.removeLayer(userPointLayer);
    logToConsole("User point module deactivated");
  }
};

// Wire up floating GPS and manual placement buttons
function setupFloatingButtons() {
  const gpsBtn = document.getElementById("userPointGPSBtn");
  const manualBtn = document.getElementById("userPointManualBtn");

  // GPS Point button → gets current location and saves point
  if (gpsBtn) {
    gpsBtn.onclick = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        addUserPoint(latitude, longitude);
      }, () => alert("Failed to get location"));
    };
  }

  // Manual placement button → toggles manual mode with pulsing UI
  if (manualBtn) {
    manualBtn.onclick = () => {
      manualMode = !manualMode;
      manualBtn.classList.toggle("pulsing", manualMode);
    };

    // When map is clicked in manual mode, add point at click location
    mapRef.on("click", e => {
      if (manualMode) addUserPoint(e.latlng.lat, e.latlng.lng);
    });
  }
}

// Collect values from form and store new point to map + IndexedDB
async function addUserPoint(lat, lon) {
  const type = document.getElementById("typeSelector")?.value || "Unknown";
  const subtype = document.getElementById("subtypeSelector")?.value || "Unspecified";
  const desc = document.getElementById("descInput")?.value.trim() || "";

  const feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      timestamp: new Date().toISOString(),
      SURVEY_TYPE: "User Point",
      TYPE: type,
      SUBTYPE: subtype,
      DESC: desc,
      lat,
      lon
    }
  };

  await saveUserPoint(feature);
  allUserPoints.push(feature);
  renderAllUserPoints();

  logToConsole(`✅ Point added: ${type} / ${subtype} @ ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
}

// Draw all collected user points in table and on the map
function renderAllUserPoints() {
  userPointLayer.clearLayers();

  const container = document.getElementById("userPointsTableContainer");
  if (!container) return;

  // Table rows
  const rows = allUserPoints.map((pt, i) => {
    const { TYPE, SUBTYPE, DESC } = pt.properties;
    return `
      <tr>
        <td>${TYPE}</td>
        <td>${SUBTYPE}</td>
        <td>${DESC}</td>
        <td><button onclick="zoomUserPoint(${i})"><i class="fas fa-search"></i></button></td>
        <td><button onclick="deleteUserPoint(${i})"><i class="fas fa-trash"></i></button></td>
      </tr>
    `;
  });

  // Render table
  container.innerHTML = `
    <table class="feature-table">
      <thead>
        <tr><th>Type</th><th>Subtype</th><th>Description</th><th>Zoom</th><th>Delete</th></tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;

  // Add markers to map with TYPE-based styling
allUserPoints.forEach(pt => {
  const { lat, lon, TYPE, SUBTYPE, DESC } = pt.properties;

  // Define styles based on TYPE
  let style = {
    radius: 6,
    color: "black",
    fillColor: "gray",
    fillOpacity: 0.8
  };

  switch (TYPE) {
    case "Wetland":
      style.color = "#005500";
      style.fillColor = "#33aa33";
      break;
    case "Watercourse":
      style.color = "#003366";
      style.fillColor = "#3399ff";
      break;
    case "Wildlife":
      style.color = "#663300";
      style.fillColor = "#cc9966";
      break;
    case "Other":
      style.color = "#444";
      style.fillColor = "#bbb";
      break;
  }

  L.circleMarker([lat, lon], style)
    .addTo(userPointLayer)
    .bindPopup(`<b>${TYPE} / ${SUBTYPE}</b><br>${DESC}`);
});
}

// Center map on selected user point
window.zoomUserPoint = function (index) {
  const pt = allUserPoints[index];
  if (pt) {
    const { lat, lon } = pt.properties;
    mapRef.setView([lat, lon], 17);
    logToConsole(`📍 Zoomed to point: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
  }
};

// Delete a single point and re-save remaining points to IndexedDB
window.deleteUserPoint = async function (index) {
  allUserPoints.splice(index, 1);

  await deleteAllUserPoints();
  for (const pt of allUserPoints) {
    await saveUserPoint(pt);
  }

  renderAllUserPoints();
  logToConsole(`❌ Deleted point ${index + 1}`);
};

// Clear all points from memory and IndexedDB
window.clearAllUserPoints = async function () {
  await deleteAllUserPoints();
  allUserPoints = [];
  renderAllUserPoints();
  logToConsole("🗑️ All user points deleted");
};

// Console logging utility
function logToConsole(msg) {
  const logEl = document.getElementById("userConsoleLog");
  if (!logEl) return;
  const time = new Date().toLocaleTimeString();
  const div = document.createElement("div");
  div.textContent = `${time} — ${msg}`;
  logEl.prepend(div);
}