// db.js
// Manages persistent storage of user-collected points using IndexedDB (via idb library).

// Import idb helper from CDN (ES module)
// You must ensure this file is served with type="module" in your HTML
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';

// --------------------------------------------------
// 1. Open or create the IndexedDB database
// --------------------------------------------------
const dbPromise = openDB('fielddata-db', 1, {
  upgrade(db) {
    // Create object store for user points if it doesn't already exist
    if (!db.objectStoreNames.contains('user_points')) {
      db.createObjectStore('user_points', {
        keyPath: 'id',        // Unique auto-incrementing key for each feature
        autoIncrement: true
      });
    }
  }
});

// --------------------------------------------------
// 2. Save a user point feature (GeoJSON-style)
// --------------------------------------------------
/**
 * Add a point feature to IndexedDB
 * @param {Object} feature - A GeoJSON-style feature object
 */
export async function saveUserPoint(feature) {
  const db = await dbPromise;
  await db.add('user_points', feature);
}

// --------------------------------------------------
// 3. Retrieve all saved user point features
// --------------------------------------------------
/**
 * Fetch all saved user points from IndexedDB
 * @returns {Promise<Array>} - Array of GeoJSON-style features
 */
export async function getAllUserPoints() {
  const db = await dbPromise;
  return await db.getAll('user_points');
}

// --------------------------------------------------
// 4. Delete all user points
// --------------------------------------------------
/**
 * Clear all stored user points from IndexedDB
 */
export async function deleteAllUserPoints() {
  const db = await dbPromise;
  await db.clear('user_points');
}