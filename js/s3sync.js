// js/s3sync.js

import { buildGeoJSON, log } from './utils.js';

const uploadLogUrl = "https://fraxinus-fielddata.s3.us-east-2.amazonaws.com/uploads_log.json";

/**
 * Uploads a GeoJSON feature set to S3 with a timestamped filename
 * @param {Array} features - array of GeoJSON features
 * @param {String} geomType - e.g. "POINT", "LINE"
 */
export async function syncToS3(features, geomType = "DATA") {
  if (!features?.length) throw new Error("No features to upload.");

  const geojson = buildGeoJSON(features);
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const surveyor = (features[0].properties?.SURVEYOR || "unknown").replace(/\s+/g, '');
  const site = (features[0].properties?.SITE || "site").replace(/\s+/g, '');
  const filename = `${geomType}_${surveyor}_${site}_${date}_${time}_points.geojson`;
  const url = `https://fraxinus-fielddata.s3.us-east-2.amazonaws.com/${filename}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/geo+json" },
    body: JSON.stringify(geojson)
  });

  if (!response.ok) throw new Error("Upload failed.");

  log(`✅ Uploaded to S3 as ${filename}`);

  const logEntry = {
    filename,
    url,
    surveyor,
    site,
    timestamp: now.toISOString()
  };

  try {
    const res = await fetch(uploadLogUrl);
    const currentLog = res.ok ? await res.json() : [];
    currentLog.push(logEntry);
    await fetch(uploadLogUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentLog, null, 2)
    });
    log("📝 uploads_log.json updated.");
  } catch (e) {
    log(`⚠️ Failed to update uploads_log.json: ${e.message}`);
  }

  return filename;
}