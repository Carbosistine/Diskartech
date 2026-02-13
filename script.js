let map;
let userMarker;
let stationMarkers = [];
let html5QrCode;
let isScanning = false;

// Charging station locations (Your school coordinates)
const stations = [
    { name: "School Canteen", lat: 12.667599141285237, lng: 123.88106065789424, distance: null },
    { name: "Library", lat: 12.667828642353323, lng: 123.88142728340732, distance: null },
    { name: "ICT Building", lat: 12.667455809209827, lng: 123.8816142627787, distance: null },
    { name: "CCB Building", lat: 12.66732476935383, lng: 123.8822385087018, distance: null }
];

// Initialize Leaflet Map
function initMap() {
    const defaultLocation = [12.667599141285237, 123.88191589351497];
    
    map = L.map('map').setView(defaultLocation, 17);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    stations.forEach(station => {
        const marker = L.marker([station.lat, station.lng])
            .addTo(map)
            .bindPopup(`<strong>${station.name}</strong><br>⚡ Charging Station Available`);
        stationMarkers.push(marker);
    });
}

// Calculate distance between two coordinates (Haversine formula)
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

// Find nearest station
function findStation() {
    const statusElement = document.getElementById('status');
    const mapCaption = document.getElementById('mapCaption');
    
    if (navigator.geolocation) {
        statusElement.innerHTML = "Status: Finding your location...";
        mapCaption.innerHTML = "Locating you...";
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                stations.forEach(station => {
                    station.distance = calculateDistance(userLat, userLng, station.lat, station.lng);
                });
                
                const sortedStations = [...stations].sort((a, b) => a.distance - b.distance);
                const nearest = sortedStations[0];
                
                const bounds = L.latLngBounds(
                    [userLat, userLng],
                    [nearest.lat, nearest.lng]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
                
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
                        .bindPopup("📍 You are here!");
                }
                
                let captionHTML = '<strong>Nearby Charging Stations:</strong><br>';
                sortedStations.forEach((station, index) => {
                    const distanceText = station.distance < 1000 
                        ? `${Math.round(station.distance)} meters`
                        : `${(station.distance / 1000).toFixed(2)} km`;
                    
                    if (index === 0) {
                        captionHTML += `⚡ <strong>${station.name}</strong> - ${distanceText} (Nearest)<br>`;
                    } else {
                        captionHTML += `⚡ ${station.name} - ${distanceText}<br>`;
                    }
                });
                
                mapCaption.innerHTML = captionHTML;
                statusElement.innerHTML = `Status: Found ${sortedStations.length} stations nearby`;
            },
            function(error) {
                statusElement.innerHTML = "Status: Location access denied";
                mapCaption.innerHTML = "❌ Unable to access your location. Please enable location services.";
                console.error(error);
            }
        );
    } else {
        statusElement.innerHTML = "Status: Geolocation not supported";
        mapCaption.innerHTML = "❌ Your browser doesn't support geolocation";
    }
}

// Start QR Code Scanner
function startScanner() {
    const qrScanner = document.getElementById('qrScanner');
    const statusElement = document.getElementById('status');
    
    // Show scanner
    qrScanner.style.display = 'block';
    statusElement.innerHTML = "Status: Opening camera...";
    
    // Initialize QR Code scanner
    html5QrCode = new Html5Qrcode("qrReader");
    
    const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };
    
    html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText, decodedResult) => {
            // QR code successfully scanned
            console.log(`QR Code detected: ${decodedText}`);
            
            // Stop scanning
            stopScanner();
            
            try {
                // Parse the JSON data from QR code
                const data = JSON.parse(decodedText);
                
                // Display rental confirmation with station info
                statusElement.innerHTML = `Status: Power Bank Rented ⚡<br>
                    Connected to: <strong>${data.station}</strong><br>
                    Power Bank ID: ${data.id}`;
                
                // Show success alert
                alert(`✅ Power Bank Rented Successfully!\n\n` +
                      `📍 Station: ${data.station}\n` +
                      `🔋 Power Bank ID: ${data.id}\n\n` +
                      `You are now connected to ${data.station}!`);
                
            } catch (error) {
                // If QR code is not JSON format, treat as simple ID
                statusElement.innerHTML = `Status: Power Bank Rented ⚡<br>ID: ${decodedText}`;
                alert(`Power Bank Rented!\nID: ${decodedText}`);
            }
        },
        (errorMessage) => {
            // Keep scanning (this is normal when no QR code detected)
        }
    ).catch((err) => {
        // Camera access error
        console.error("Error starting scanner:", err);
        statusElement.innerHTML = "Status: Camera access denied";
        qrScanner.style.display = 'none';
        alert("Please allow camera access to scan QR codes");
    });
    
    isScanning = true;
}

// Stop QR Code Scanner
function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('qrScanner').style.display = 'none';
            isScanning = false;
        }).catch((err) => {
            console.error("Error stopping scanner:", err);
        });
    } else {
        document.getElementById('qrScanner').style.display = 'none';
    }
}

// Rent Power Bank (opens QR scanner)
function rentPower() {
    startScanner();
}

// Return Power Bank
function returnPower() {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = "Status: Returned Successfully ✓";
    
    alert("Power Bank returned successfully! Thank you.");
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    const findStationBtn = document.getElementById('findStationBtn');
    const rentPowerBtn = document.getElementById('rentPowerBtn');
    const returnPowerBtn = document.getElementById('returnPowerBtn');
    const closeScannerBtn = document.getElementById('closeScannerBtn');
    
    findStationBtn.addEventListener('click', findStation);
    rentPowerBtn.addEventListener('click', rentPower);
    returnPowerBtn.addEventListener('click', returnPower);
    closeScannerBtn.addEventListener('click', stopScanner);
});