// Global variables for Chart and Map instances
let speedChartInstance;
let busChartInstance;
let congestionChartInstance;
let trafficMap;
let trafficLayer;

// Configuration
const BACKEND_URL = 'http://127.0.0.1:5000/api/predict_traffic';
const UPDATE_INTERVAL_MS = 10000; // Update every 10 seconds

// ------------------------------------
// 🗺️ Map Initialization
// ------------------------------------
function initMap() {
    // Coordinates for Hyderabad (example center)
    const hyderabadCoords = [17.3850, 78.4867]; 
    
    // Initialize Leaflet map
    trafficMap = L.map('liveMap').setView(hyderabadCoords, 13); // Zoom level 13

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(trafficMap);
    
    // Create a layer group for traffic lines
    trafficLayer = L.layerGroup().addTo(trafficMap);
}
initMap();

// ------------------------------------
// 📊 Chart Initialization (Using your original data structure)
// ------------------------------------

// Chart 1 - Speed Frequency
speedChartInstance = new Chart(document.getElementById('speedChart'), {
    type: 'bar',
    data: {
        labels: ['0-20', '20-40', '40-60', '60-80', '80+'],
        datasets: [{
            label: 'Speed (km/h)',
            data: [15, 40, 60, 35, 10], // Static initial data
            backgroundColor: '#00bcd4'
        }]
    },
    options: { scales: { y: { beginAtZero: true } } }
});

// Chart 2 - Bus Movement (Will become live)
busChartInstance = new Chart(document.getElementById('busChart'), {
    type: 'line',
    data: {
        labels: ['08:00', '08:10', '08:20', '08:30', '08:40'],
        datasets: [{
            label: 'Bus Count',
            data: [10, 15, 13, 18, 14], // Initial data
            borderColor: '#ffd700',
            borderWidth: 2,
            fill: false
        }]
    }
});

// Chart 3 - Congestion Score (Will become live)
congestionChartInstance = new Chart(document.getElementById('congestionChart'), {
    type: 'bar',
    data: {
        labels: ['08:00', '08:10', '08:20', '08:30', '08:40'],
        datasets: [{
            label: 'Congestion Level',
            data: [30, 50, 70, 60, 45], // Initial data
            backgroundColor: '#ff1744'
        }]
    },
    options: { scales: { y: { beginAtZero: true, max: 100 } } }
});


// ------------------------------------
// ⚡ Helper Functions
// ------------------------------------

// Updates the speed gauge needle position
function updateSpeedGauge(speed) {
    const needle = document.getElementById("needle");
    const speedValue = document.getElementById("speedValue");
    const max_speed = 120;
    
    const clamped_speed = Math.min(speed, max_speed); 
    const angle = (clamped_speed / max_speed) * 180;

    needle.style.transform = `rotate(${angle}deg)`;
    speedValue.textContent = `${Math.round(speed)} km/h`;
}
function getRandomTrafficVolume() {
    return Math.floor(Math.random() * (100 - 20 + 1)) + 20; // Volume between 20 and 100 vehicles/hr
}
// Updates charts with a sliding window effect
function updateSlidingChart(chart, newValue, maxPoints = 5) {
    if (chart) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Add new point and remove the oldest one
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(newValue);
        
        if (chart.data.labels.length > maxPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update('none'); // 'none' for smooth update
    }
}

// Draws predicted traffic flow on the Leaflet map
function updateTrafficMap(segments) {
    if (!trafficMap) return;

    trafficLayer.clearLayers(); // Remove previous traffic lines

    segments.forEach(segment => {
        let color;
        // Logic to determine color based on predicted speed
        if (segment.speed < 20) {
            color = 'red';      // Heavy Congestion
        } else if (segment.speed < 40) {
            color = 'yellow';   // Moderate Congestion
        } else {
            color = 'lime';     // Free Flow
        }

        const polyline = L.polyline(segment.coords, { 
            color: color, 
            weight: 6, 
            opacity: 0.8 
        }).addTo(trafficLayer);

        polyline.bindTooltip(`Predicted: ${segment.speed} km/h`, { 
            permanent: false, 
            direction: "top" 
        });
    });
}

// Dummy segments for testing if the backend is down
function getDummyTrafficSegments(avg_speed) {
    return [
        {
            coords: [[17.3900, 78.4800], [17.3800, 78.4850]],
            speed: Math.max(10, avg_speed - 15)
        },
        {
            coords: [[17.3750, 78.4600], [17.3850, 78.4700]],
            speed: Math.min(80, avg_speed + 10)
        }
    ];
}

// ------------------------------------
// 🧠 Main Data Fetching and Update Loop
// ------------------------------------

function updateDashboardData() {
    const now = new Date();
    const time_of_day = now.getHours();
    const day_of_week = now.getDay();
    const current_vehicles = Math.floor(Math.random() * 200) + 50; 

    const prediction_data = {
        time_of_day: time_of_day,
        day_of_week: day_of_week,
        current_vehicles: current_vehicles
    };

    // 1. Fetch predictions from your ML backend
    fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prediction_data),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            const avg_speed = data.predicted_avg_speed;
            const congestion_score = data.predicted_congestion_score;
            // ⭐ NEW: Get the predicted bus count from the backend
            const bus_count = data.predicted_bus_count || Math.floor(avg_speed / 5); 
            
            // Backend must return 'traffic_segments' containing [{coords: [[lat, lng], ...], speed: X}]
            const predicted_traffic_segments = data.traffic_segments || getDummyTrafficSegments(avg_speed); 

            // 2. Update Map
            updateTrafficMap(predicted_traffic_segments);

            // 3. Update Gauge
            updateSpeedGauge(avg_speed);

            // 4. Update Charts (Live sliding data)
            updateSlidingChart(congestionChartInstance, congestion_score);
            
            // ⭐ NEW: Use the predicted bus count for the Bus Movement chart
            updateSlidingChart(busChartInstance, bus_count); 
            
            // NOTE: Speed Frequency (speedChartInstance) typically needs aggregated data over a longer period, 
            // so it's kept static for now.
        } else {
            console.error('Prediction API failed:', data);
            updateSpeedGauge(40); // Fallback speed
            updateTrafficMap(getDummyTrafficSegments(40));
            // Fallback for bus chart
            updateSlidingChart(busChartInstance, Math.floor(40 / 5)); 
        }
    })
    .catch(error => {
        console.error('Error fetching prediction:', error);
        updateSpeedGauge(35); // Fallback speed on connection error
        updateTrafficMap(getDummyTrafficSegments(35));
        // Fallback for bus chart
        updateSlidingChart(busChartInstance, Math.floor(35 / 5)); 
    });
}

// Start the loop for dynamic updates
setInterval(updateDashboardData, UPDATE_INTERVAL_MS);
updateDashboardData(); // Initial call


// ------------------------------------
// 🕒 Clock (Original function remains)
// ------------------------------------
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();