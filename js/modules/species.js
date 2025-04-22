// species.js
// This module manages species observations: loading list, placing points, saving notes/photos, and syncing with localStorage.

let speciesList = [], speciesCodeMap = {}, speciesLayer = L.layerGroup();

export async function initSpeciesModule(map) {
  await loadSpeciesList();
  map.addLayer(speciesLayer);
  restoreSavedObservations(map);
  setupSpeciesButton(map);
  setupSpeciesDrawer();
}

// Load species from CSV and populate the global datalist
async function loadSpeciesList() {
  try {
    const res = await fetch('assets/species_list.csv');
    const text = await res.text();
    speciesList = [];
    speciesCodeMap = {};

    const datalist = document.getElementById('species-datalist');
    if (!datalist) {
      console.error('❌ species-datalist element missing in DOM');
      return;
    }
    datalist.innerHTML = '';

    text.trim().split('\n').slice(1).forEach(line => {
      const [code, name] = line.split(',');
      if (code && name) {
        const cleanName = name.trim();
        speciesList.push(cleanName);
        speciesCodeMap[cleanName] = code.trim();

        const opt = document.createElement('option');
        opt.value = cleanName;
        datalist.appendChild(opt);
      }
    });

    console.log(`✅ Loaded ${speciesList.length} species entries.`);
  } catch (err) {
    console.error('⚠️ Failed to load species list:', err);
  }
}

function createSpeciesPopup(map, latlng, data = {}) {
  const marker = L.marker(latlng, { draggable: true }).addTo(speciesLayer);
  const container = document.createElement('div');
  container.className = 'custom-popup';

  const speciesInput = document.createElement('input');
  speciesInput.placeholder = 'Species';
  speciesInput.value = data.species || '';
  speciesInput.setAttribute('list', 'species-datalist');

  const noteInput = document.createElement('textarea');
  noteInput.placeholder = 'Note';
  noteInput.value = data.note || '';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';

  container.append(speciesInput, noteInput, saveBtn, deleteBtn);
  marker.bindPopup(container).openPopup();

  saveBtn.onclick = () => {
    const pt = {
      lat: marker.getLatLng().lat,
      lng: marker.getLatLng().lng,
      species: speciesInput.value,
      elcode: speciesCodeMap[speciesInput.value] || '',
      note: noteInput.value,
      datetime: new Date().toISOString()
    };
    const existing = JSON.parse(localStorage.getItem('speciesPoints') || '[]');
    existing.push(pt);
    localStorage.setItem('speciesPoints', JSON.stringify(existing));
    map.closePopup();
    renderSpeciesTable();
  };

  deleteBtn.onclick = () => {
    const lat = marker.getLatLng().lat;
    const lng = marker.getLatLng().lng;
    const updated = JSON.parse(localStorage.getItem('speciesPoints') || '[]').filter(p =>
      Math.abs(p.lat - lat) > 0.00001 || Math.abs(p.lng - lng) > 0.00001
    );
    localStorage.setItem('speciesPoints', JSON.stringify(updated));
    speciesLayer.removeLayer(marker);
    map.closePopup();
    renderSpeciesTable();
  };
}

function setupSpeciesButton(map) {
  const btn = document.getElementById('speciesObsBtn');
  if (!btn) {
    console.error('❌ speciesObsBtn not found in DOM');
    return;
  }

  btn.addEventListener('click', () => {
    console.log('📍 Species button clicked');
    navigator.geolocation.getCurrentPosition(pos => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      console.log('✅ Geolocation success:', latlng);
      createSpeciesPopup(map, latlng);
    }, err => {
      console.error('❌ Geolocation error:', err);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  });
}

function restoreSavedObservations(map) {
  const saved = JSON.parse(localStorage.getItem('speciesPoints') || '[]');
  saved.forEach(p => {
    createSpeciesPopup(map, [p.lat, p.lng], p);
  });
  renderSpeciesTable();
}

function setupSpeciesDrawer() {
  const drawer = document.getElementById("speciesPointsDrawer");
  const btn = document.getElementById("openSpeciesDrawerBtn");
  const close = document.getElementById("closeSpeciesPointsDrawer");
  if (btn && drawer) {
    btn.onclick = () => drawer.classList.toggle("hidden");
  }
  if (close && drawer) {
    close.onclick = () => drawer.classList.add("hidden");
  }
}

function renderSpeciesTable() {
  const container = document.getElementById("speciesPointsTableContainer");
  if (!container) return;

  const points = JSON.parse(localStorage.getItem("speciesPoints") || "[]");
  if (points.length === 0) {
    container.innerHTML = "<p>No species observations recorded.</p>";
    return;
  }

  let html = `<table class="feature-table">
    <thead>
      <tr>
        <th>Species</th>
        <th>ELCODE</th>
        <th>Note</th>
        <th>Lat</th>
        <th>Lng</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>`;

  points.forEach(p => {
    html += `<tr>
      <td>${p.species}</td>
      <td>${p.elcode}</td>
      <td>${p.note}</td>
      <td>${p.lat.toFixed(5)}</td>
      <td>${p.lng.toFixed(5)}</td>
      <td>${new Date(p.datetime).toLocaleString()}</td>
    </tr>`;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}
