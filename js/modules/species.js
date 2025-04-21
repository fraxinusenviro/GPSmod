// species.js
let speciesList = [], speciesCodeMap = {}, speciesLayer = L.layerGroup();

export async function initSpeciesModule(map) {
    await loadSpeciesList();
    map.addLayer(speciesLayer);
    restoreSavedObservations(map);
  
    const btn = document.getElementById("speciesObsBtn");
    if (btn) {
      console.log("✅ speciesObsBtn found, wiring click handler");
      btn.onclick = () => {
        console.log("📍 Species button clicked");
        navigator.geolocation.getCurrentPosition(
          pos => {
            console.log("✅ Geolocation success");
            const latlng = [pos.coords.latitude, pos.coords.longitude];
            //createSpeciesPopup(map, latlng);
            createSpeciesPopup(map, [45.0, -63.0]);
          },
          err => {
            alert("Geolocation failed: " + err.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      };
    } else {
      console.warn("❌ speciesObsBtn not found in DOM");
    }
  }
  
  
async function loadSpeciesList() {
  try {
    const res = await fetch('assets/species_list.csv');
    const text = await res.text();
    speciesList = [];
    speciesCodeMap = {};

    text.trim().split('\n').slice(1).forEach(line => {
      const [code, name] = line.split(',');
      if (code && name) {
        speciesList.push(name.trim());
        speciesCodeMap[name.trim()] = code.trim();
      }
    });
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
  
    const datalist = document.createElement('datalist');
    datalist.id = 'species-datalist';
    speciesList.forEach(sp => {
      const opt = document.createElement('option');
      opt.value = sp;
      datalist.appendChild(opt);
    });
  
    const noteInput = document.createElement('textarea');
    noteInput.placeholder = 'Note';
    noteInput.value = data.note || '';
  
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
  
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
  
    container.append(speciesInput, datalist, noteInput, saveBtn, deleteBtn);
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
    };
  }

function setupSpeciesButton(map) {
  const btn = L.control({ position: 'topright' });
  btn.onAdd = () => {
    const div = L.DomUtil.create('div', 'floating-btn');
    div.innerHTML = '<i class="fas fa-dove" title="Add Species Obs"></i>';
    div.onclick = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const latlng = [pos.coords.latitude, pos.coords.longitude];
        createSpeciesPopup(map, latlng);
      });
    };
    return div;
  };
  btn.addTo(map);
}



function restoreSavedObservations(map) {
  const saved = JSON.parse(localStorage.getItem('speciesPoints') || '[]');
  saved.forEach(p => {
    createSpeciesPopup(map, [p.lat, p.lng], p);
  });
}
