// js/export.js

import { buildGeoJSON, log } from './utils.js';

export function exportToCSV(geomType, features) {
  if (!features?.length) {
    alert(`No ${geomType} features to export.`);
    return;
  }

  const allProps = Object.keys(features[0].properties || {});
  const header = [...allProps, 'geometry_type', 'geometry'];

  const rows = features.map(f => {
    const props = allProps.map(k => `"${f.properties[k] ?? ''}"`);
    const geom = JSON.stringify(f.geometry);
    return [...props, f.geometry.type, `"${geom}"`].join(",");
  });

  const csvContent = [header.join(","), ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${geomType}_features.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  log(`📄 Exported ${geomType} features to CSV`);
}

export function exportToGeoJSON(geomType, features) {
  if (!features?.length) {
    alert(`No ${geomType} features to export.`);
    return;
  }

  const geojson = buildGeoJSON(features);

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: "application/geo+json"
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${geomType}_features.geojson`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  log(`🗺️ Exported ${geomType} features to GeoJSON`);
}