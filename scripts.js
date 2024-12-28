require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID

}

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database(); // Use Realtime Database instead of Firestore

// Initialize Leaflet Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// Initialize Chart.js
const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Chlorophyll Fluorescence',
            data: [],
            backgroundColor: 'rgba(0, 128, 0, 0.5)',
            borderColor: 'rgba(0, 128, 0, 1)',
            borderWidth: 1,
            fill: false
        }]
    },
    options: {
        scales: {
            x: { beginAtZero: true },
            y: { beginAtZero: true }
        }
    }
});

// Google Sheets Update Function
async function updateGoogleSheets(data) {
    const url = process.env.GOOGLE_SCRIPT_URL;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        console.log("Google Sheets Update:", await response.json());
    } catch (error) {
        console.error("Error updating Google Sheets:", error);
    }
}

// Update Dashboard with Firebase Realtime Database Data
const buoyDataRef = database.ref('buoy_data'); // Reference to the buoy data in Realtime Database
buoyDataRef.orderByChild("timestamp").limitToLast(1).on("child_added", (snapshot) => {
    const data = snapshot.val();
    document.getElementById('latitude').textContent = data.latitude;
    document.getElementById('longitude').textContent = data.longitude;
    document.getElementById('fluorescence').textContent = data.fluorescence;

    // Update map
    L.marker([data.latitude, data.longitude]).addTo(map)
        .bindPopup(`Fluorescence: ${data.fluorescence}`)
        .openPopup();

    // Update chart
    const labels = chart.data.labels;
    const dataset = chart.data.datasets[0].data;
    const time = new Date(data.timestamp).toLocaleTimeString(); // Firebase timestamp is already a JavaScript timestamp
    if (!labels.includes(time)) { // Prevent duplicate labels
        labels.push(time);
        dataset.push(data.fluorescence);
        chart.update();
    }

    // Prepare data for Google Sheets
    const googleSheetsData = {
        time: time,
        latitude: data.latitude,
        longitude: data.longitude,
        fluorescence: data.fluorescence
    };

    // Send data to Google Sheets
    updateGoogleSheets(googleSheetsData);
});
