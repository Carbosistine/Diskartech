let map;
let desktopMap;
let userMarker;
let userMarkerDesktop;
let stationMarkers = [];
let stationMarkersDesktop = [];
let html5QrCode;
let html5QrCodeDesktop;
let isScanning = false;
let isScanningDesktop = false;
let currentConnection = null;

// Charging station locations
const stations = [
    { name: "School Canteen", lat: 12.667599141285237, lng: 123.88106065789424, distance: null },
    { name: "Library", lat: 12.667828642353323, lng: 123.88142728340732, distance: null },
    { name: "ICT Building", lat: 12.667455809209827, lng: 123.8816142627787, distance: null },
    { name: "CCB Building", lat: 12.66732476935383, lng: 123.8822385087018, distance: null }
];

// ==================== MOBILE FUNCTIONS ====================

// Initialize mobile map
function initMobileMap() {
    const defaultLocation = [12.667599141285237, 123.88191589351497];
    
    map = L.map('map', {
        zoomControl: false
    }).setView(defaultLocation, 17);
    
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add station markers
    stations.forEach((station, index) => {
        const marker = L.marker([station.lat, station.lng])
            .addTo(map)
            .bindPopup(`<strong>${station.name}</strong><br>Charging Station Available`);
        stationMarkers.push(marker);
    });
}

// Calculate distance
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

// Open drawer
function openDrawer(drawerId) {
    closeAllDrawers();
    const drawer = document.getElementById(drawerId);
    drawer.classList.add('active');
    
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Add active to clicked nav item
    if (drawerId === 'findDrawer') {
        document.getElementById('findNavBtn').classList.add('active');
    } else if (drawerId === 'scanDrawer') {
        document.getElementById('scanNavBtn').classList.add('active');
        startMobileScanner();
    } else if (drawerId === 'statusDrawer') {
        document.getElementById('statusNavBtn').classList.add('active');
    }
}

// Close all drawers
function closeAllDrawers() {
    document.querySelectorAll('.drawer').forEach(drawer => {
        drawer.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    if (isScanning) {
        stopMobileScanner();
    }
}

// Locate user on mobile
function locateUserMobile() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Calculate distances
                stations.forEach(station => {
                    station.distance = calculateDistance(userLat, userLng, station.lat, station.lng);
                });
                
                const sortedStations = [...stations].sort((a, b) => a.distance - b.distance);
                
                // Update map
                const bounds = L.latLngBounds();
                bounds.extend([userLat, userLng]);
                sortedStations.forEach(station => {
                    bounds.extend([station.lat, station.lng]);
                });
                map.fitBounds(bounds, { padding: [50, 50] });
                
                // Add user marker
                if (userMarker) {
                    userMarker.setLatLng([userLat, userLng]);
                } else {
                    const blueIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    
                    userMarker = L.marker([userLat, userLng], { icon: blueIcon })
                        .addTo(map)
                        .bindPopup("You are here");
                }
                
                // Display station list
                displayStationList(sortedStations);
            },
            function(error) {
                alert('Unable to access your location. Please enable location services.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Display station list
function displayStationList(sortedStations) {
    const stationList = document.getElementById('stationList');
    stationList.innerHTML = '';
    
    sortedStations.forEach((station, index) => {
        const distanceText = station.distance < 1000 
            ? `${Math.round(station.distance)} meters`
            : `${(station.distance / 1000).toFixed(2)} km`;
        
        const stationItem = document.createElement('div');
        stationItem.className = 'station-item';
        stationItem.innerHTML = `
            <div class="station-item-icon">
                <i class="fas fa-charging-station"></i>
            </div>
            <div class="station-item-info">
                <h3>${station.name}</h3>
                <p>${distanceText} away${index === 0 ? ' (Nearest)' : ''}</p>
            </div>
        `;
        
        stationItem.addEventListener('click', () => {
            map.setView([station.lat, station.lng], 18);
            closeAllDrawers();
        });
        
        stationList.appendChild(stationItem);
    });
}

// Start mobile QR scanner
function startMobileScanner() {
    html5QrCode = new Html5Qrcode("qrReader");
    
    const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            stopMobileScanner();
            handleQRScan(decodedText);
        },
        (errorMessage) => {
            // Scanning...
        }
    ).catch((err) => {
        console.error("Error starting scanner:", err);
        alert("Unable to access camera. Please allow camera permissions.");
    });
    
    isScanning = true;
}

// Stop mobile QR scanner
function stopMobileScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
        }).catch((err) => {
            console.error("Error stopping scanner:", err);
        });
    }
}

// Handle QR scan
function handleQRScan(decodedText) {
    try {
        const data = JSON.parse(decodedText);
        currentConnection = data;
        
        // Update mobile status
        updateMobileStatus(data);
        
        // Update desktop status
        updateDesktopStatus(data);
        
        // Close scan drawer and open status drawer
        closeAllDrawers();
        openDrawer('statusDrawer');
        
        alert(`Power Bank Connected!\n\nStation: ${data.station}\nPower Bank ID: ${data.id}`);
    } catch (error) {
        currentConnection = { id: decodedText, station: "Unknown" };
        updateMobileStatus(currentConnection);
        updateDesktopStatus(currentConnection);
        alert(`Power Bank Connected!\nID: ${decodedText}`);
    }
}

// Update mobile status
function updateMobileStatus(data) {
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.innerHTML = `
        <div class="status-icon">
            <i class="fas fa-plug-circle-check"></i>
        </div>
        <h3>Connected</h3>
        <p>Power bank is currently in use</p>
        <div class="status-details">
            <div class="status-row">
                <span class="status-label">Station:</span>
                <span class="status-value">${data.station}</span>
            </div>
            <div class="status-row">
                <span class="status-label">Power Bank ID:</span>
                <span class="status-value">${data.id}</span>
            </div>
            <div class="status-row">
                <span class="status-label">Status:</span>
                <span class="status-value">Active</span>
            </div>
        </div>
        <button class="disconnect-btn" onclick="disconnectPowerBank()">
            <i class="fas fa-plug-circle-xmark"></i>
            <span>Return Power Bank</span>
        </button>
    `;
}

// Disconnect power bank
function disconnectPowerBank() {
    if (confirm('Are you sure you want to return the power bank?')) {
        currentConnection = null;
        
        // Reset mobile status
        const statusContainer = document.getElementById('statusContainer');
        statusContainer.innerHTML = `
            <div class="status-icon">
                <i class="fas fa-plug-circle-xmark"></i>
            </div>
            <h3>Not Connected</h3>
            <p>Scan a power bank QR code to get started</p>
        `;
        
        // Reset desktop status
        const desktopStatus = document.getElementById('desktopStatus');
        desktopStatus.innerHTML = `
            <div class="status-badge disconnected">
                <i class="fas fa-plug-circle-xmark"></i>
                <span>Not Connected</span>
            </div>
        `;
        
        alert('Power bank returned successfully!');
        closeAllDrawers();
    }
}

// ==================== DESKTOP FUNCTIONS ====================

// Initialize desktop map
function initDesktopMap() {
    const defaultLocation = [12.667599141285237, 123.88191589351497];
    
    desktopMap = L.map('desktopMap', {
        zoomControl: true
    }).setView(defaultLocation, 17);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(desktopMap);
    
    // Add station markers
    stations.forEach((station, index) => {
        const marker = L.marker([station.lat, station.lng])
            .addTo(desktopMap)
            .bindPopup(`<strong>${station.name}</strong><br>Charging Station Available`);
        stationMarkersDesktop.push(marker);
    });
}

// Locate user on desktop
function locateUserDesktop() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Calculate distances
                stations.forEach(station => {
                    station.distance = calculateDistance(userLat, userLng, station.lat, station.lng);
                });
                
                const sortedStations = [...stations].sort((a, b) => a.distance - b.distance);
                
                // Update map
                const bounds = L.latLngBounds();
                bounds.extend([userLat, userLng]);
                sortedStations.forEach(station => {
                    bounds.extend([station.lat, station.lng]);
                });
                desktopMap.fitBounds(bounds, { padding: [50, 50] });
                
                // Add user marker
                if (userMarkerDesktop) {
                    userMarkerDesktop.setLatLng([userLat, userLng]);
                } else {
                    const blueIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    
                    userMarkerDesktop = L.marker([userLat, userLng], { icon: blueIcon })
                        .addTo(desktopMap)
                        .bindPopup("You are here");
                }
                
                // Update desktop station list with distances
                updateDesktopStationList(sortedStations);
            },
            function(error) {
                alert('Unable to access your location. Please enable location services.');
            }
        );
    }
}

// Update desktop station list
function updateDesktopStationList(sortedStations) {
    const stationCards = document.querySelectorAll('.station-card');
    
    sortedStations.forEach((station, index) => {
        const distanceText = station.distance < 1000 
            ? `${Math.round(station.distance)} meters away`
            : `${(station.distance / 1000).toFixed(2)} km away`;
        
        const originalIndex = stations.findIndex(s => s.name === station.name);
        const card = stationCards[originalIndex];
        const distanceElement = card.querySelector('.station-distance');
        distanceElement.textContent = distanceText + (index === 0 ? ' (Nearest)' : '');
    });
}

// Open desktop scan modal
function openDesktopScanModal() {
    const modal = document.getElementById('desktopScanModal');
    modal.classList.add('active');
    startDesktopScanner();
}

// Close desktop scan modal
function closeDesktopScanModal() {
    const modal = document.getElementById('desktopScanModal');
    modal.classList.remove('active');
    stopDesktopScanner();
}

// Start desktop QR scanner
function startDesktopScanner() {
    html5QrCodeDesktop = new Html5Qrcode("desktopQrReader");
    
    const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };
    
    html5QrCodeDesktop.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            stopDesktopScanner();
            closeDesktopScanModal();
            handleQRScan(decodedText);
        },
        (errorMessage) => {
            // Scanning...
        }
    ).catch((err) => {
        console.error("Error starting scanner:", err);
        alert("Unable to access camera. Please allow camera permissions.");
    });
    
    isScanningDesktop = true;
}

// Stop desktop QR scanner
function stopDesktopScanner() {
    if (html5QrCodeDesktop && isScanningDesktop) {
        html5QrCodeDesktop.stop().then(() => {
            isScanningDesktop = false;
        }).catch((err) => {
            console.error("Error stopping scanner:", err);
        });
    }
}

// Update desktop status
function updateDesktopStatus(data) {
    const desktopStatus = document.getElementById('desktopStatus');
    desktopStatus.innerHTML = `
        <div class="status-badge connected">
            <i class="fas fa-plug-circle-check"></i>
            <span>Connected</span>
        </div>
        <div class="connection-details">
            <div class="detail-row">
                <span class="detail-label">Station:</span>
                <span class="detail-value">${data.station}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Power Bank ID:</span>
                <span class="detail-value">${data.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">Active</span>
            </div>
        </div>
        <button class="desktop-disconnect-btn" onclick="disconnectPowerBank()">
            <i class="fas fa-plug-circle-xmark"></i>
            <span>Return Power Bank</span>
        </button>
    `;
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // Check if mobile or desktop
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // Initialize mobile
        initMobileMap();
        
        // Mobile navigation
        document.getElementById('findNavBtn').addEventListener('click', () => openDrawer('findDrawer'));
        document.getElementById('scanNavBtn').addEventListener('click', () => openDrawer('scanDrawer'));
        document.getElementById('statusNavBtn').addEventListener('click', () => openDrawer('statusDrawer'));
        
        // Close drawer buttons
        document.querySelectorAll('.close-drawer').forEach(btn => {
            btn.addEventListener('click', function() {
                closeAllDrawers();
            });
        });
        
        // Locate me button
        document.getElementById('locateMeBtn').addEventListener('click', locateUserMobile);
        
    } else {
        // Initialize desktop
        initDesktopMap();
        
        // Desktop actions
        document.getElementById('desktopLocateBtn').addEventListener('click', locateUserDesktop);
        document.getElementById('desktopScanBtn').addEventListener('click', openDesktopScanModal);
        
        // Station cards click
        document.querySelectorAll('.station-card').forEach((card, index) => {
            card.addEventListener('click', function() {
                // Remove active from all cards
                document.querySelectorAll('.station-card').forEach(c => c.classList.remove('active'));
                // Add active to clicked card
                this.classList.add('active');
                
                // Center map on station
                const station = stations[index];
                desktopMap.setView([station.lat, station.lng], 18);
            });
        });
        
        // Close modal
        document.querySelector('.close-modal').addEventListener('click', closeDesktopScanModal);
        
        // Close modal on backdrop click
        document.getElementById('desktopScanModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeDesktopScanModal();
            }
        });
    }
});
