import { exportToCSV, exportToGeoJSON } from './export.js';
import { syncToS3 } from './s3sync.js';
import { log } from './utils.js';

// Initialize or reuse global store
window.collectedData = window.collectedData || { all: [] };

function renderFeatureTable() {
  const container = document.getElementById("featureTableContainer");
  if (!container) return;

  const rows = window.collectedData.all.map((f, i) => {
    const desc = f.properties?.DESC || f.properties?.habitat_type || "Untitled";
    return `
      <tr>
        <td>${f.properties?.SURVEYOR || ""}</td>
        <td>${f.properties?.SITE || ""}</td>
        <td>${desc}</td>
        <td><button onclick="zoomToFeature(${i})"><i class="fas fa-search"></i></button></td>
        <td><button onclick="deleteFeature(${i})"><i class="fas fa-trash"></i></button></td>
      </tr>
    `;
  });

  container.innerHTML = `
    <table class="feature-table">
      <thead>
        <tr><th>Surveyor</th><th>Site</th><th>Description</th><th>Zoom</th><th>Delete</th></tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

// Attach render function to global scope
window.renderFeatureTable = renderFeatureTable;

window.zoomToFeature = function(index) {
  const f = window.collectedData.all[index];
  const coords = f.geometry.coordinates;
  if (f.geometry.type === "Point") {
    map.setView([coords[1], coords[0]], 17);
    log(`Zoomed to point: ${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`);
  } else {
    const layer = L.geoJSON(f);
    map.fitBounds(layer.getBounds());
    map.removeLayer(layer);
    log("Zoomed to geometry");
  }
};

window.deleteFeature = function(index) {
  window.collectedData.all.splice(index, 1);
  renderFeatureTable();
  log(`Deleted feature ${index + 1}`);
};

// Export buttons
document.getElementById("exportCSVBtn").onclick = () => {
  exportToCSV("all", window.collectedData.all);
};

document.getElementById("exportGeoJSONBtn").onclick = () => {
  exportToGeoJSON("all", window.collectedData.all);
};

document.getElementById("syncS3Btn").onclick = () => {
  syncToS3(window.collectedData.all, "ALL")
    .catch(err => log(`❌ Sync failed: ${err.message}`));
};

// Drawer controls
document.getElementById("toggleConsole").onclick = () => {
  document.getElementById("consoleDrawer").classList.toggle("hidden");
};

document.getElementById("closeExportDrawer").onclick = () => {
  document.getElementById("exportDrawer").classList.add("hidden");
};