// Load external modal HTML content for a module
export async function loadModuleModals(moduleName) {
  const url = `modals/${moduleName}.html`;
  const container = document.getElementById("modalContainer");

  if (!container.querySelector(`#globalModal_${moduleName}`)) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const html = await res.text();
      const div = document.createElement("div");
      div.innerHTML = html;
      container.appendChild(div);
      console.log(`✅ ${moduleName} modal loaded.`);
    } catch (e) {
      console.error(`❌ Failed to load modal for ${moduleName}:`, e);
    }
  } else {
    console.log(`ℹ️ ${moduleName} modal already loaded.`);
  }
}

// Format a FeatureCollection from raw features
export function buildGeoJSON(features) {
  return {
    type: "FeatureCollection",
    features: features.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: { ...f.properties }
    }))
  };
}

// Log to the collapsible console drawer
export function log(message) {
  const logDiv = document.getElementById("consoleLog");
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.textContent = `${time} — ${message}`;
  logDiv?.prepend(entry);
}