/**
 * ==========================================================================
 * MEDCONNECT – Live Delivery Tracking Controller (tracking.js)
 * Interactive Leaflet Map, Browser Geolocation API, Real/Simulated Delivery Route
 * ==========================================================================
 */

let mapInstance = null;
let riderMarker = null;
let destinationMarker = null;
let routePolyline = null;
let activeOrderId = null;
let trackingInterval = null;

// Default City Coordinates (Mumbai/Central)
let userCoordinates = [19.0760, 72.8777];
let partnerCoordinates = [19.0850, 72.8650];

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();

    // Read order ID from query params or fetch latest order
    const urlParams = new URLSearchParams(window.location.search);
    activeOrderId = urlParams.get('order_id');

    initLeafletMap();
    requestUserLiveLocation();

    if (activeOrderId) {
        startOrderTracking(activeOrderId);
    } else {
        loadLatestActiveOrder();
    }
});

function initLeafletMap() {
    const mapElement = document.getElementById('tracking-map');
    if (!mapElement) return;

    // Initialize Leaflet map centered at user coordinates
    mapInstance = L.map('tracking-map').setView(userCoordinates, 14);

    // OpenStreetMap high quality tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapInstance);

    // Custom icons
    const riderIcon = L.divIcon({
        className: 'custom-map-marker rider',
        html: `<div style="background-color: var(--primary); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;"><i class="fa-solid fa-motorcycle"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });

    const destIcon = L.divIcon({
        className: 'custom-map-marker dest',
        html: `<div style="background-color: #ef4444; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;"><i class="fa-solid fa-house"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });

    destinationMarker = L.marker(userCoordinates, { icon: destIcon }).addTo(mapInstance)
        .bindPopup('<b>Your Delivery Address</b>').openPopup();

    riderMarker = L.marker(partnerCoordinates, { icon: riderIcon }).addTo(mapInstance)
        .bindPopup('<b>Delivery Partner: Ramesh Kumar</b><br>On the way with your medicines');

    // Route line
    routePolyline = L.polyline([partnerCoordinates, userCoordinates], {
        color: '#0d9488',
        weight: 4,
        dashArray: '8, 8'
    }).addTo(mapInstance);
}

// Request Browser Geolocation for real live tracking
function requestUserLiveLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                userCoordinates = [lat, lng];

                if (destinationMarker && mapInstance) {
                    destinationMarker.setLatLng(userCoordinates);
                    mapInstance.setView(userCoordinates, 14);
                }

                // If partner coordinates are default, place partner ~1.5km away
                partnerCoordinates = [lat + 0.012, lng - 0.015];
                if (riderMarker) riderMarker.setLatLng(partnerCoordinates);
                if (routePolyline) routePolyline.setLatLngs([partnerCoordinates, userCoordinates]);

                // Update server with real user location coordinates
                if (activeOrderId) {
                    updateServerLocation(activeOrderId, lat, lng, 'user');
                }
            },
            (error) => {
                console.log('Using default delivery location coordinates.');
            },
            { enableHighAccuracy: true }
        );

        // Continuous watch for movement
        navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            userCoordinates = [lat, lng];
            if (destinationMarker) destinationMarker.setLatLng(userCoordinates);
        }, null, { enableHighAccuracy: true });
    }
}

async function loadLatestActiveOrder() {
    try {
        const res = await fetch(`${API_BASE}/orders`, { headers: MedAuth.getHeaders() });
        const data = await res.json();
        const orders = data.orders || [];
        if (orders.length > 0) {
            activeOrderId = orders[0]._id || orders[0].order_id;
            startOrderTracking(activeOrderId);
        } else {
            showToast('No active orders to track.', 'info');
        }
    } catch (e) {}
}

async function startOrderTracking(orderId) {
    activeOrderId = orderId;
    fetchTrackingData(orderId);

    // Poll tracking updates every 4 seconds
    clearInterval(trackingInterval);
    trackingInterval = setInterval(() => {
        fetchTrackingData(orderId);
    }, 4000);
}

async function fetchTrackingData(orderId) {
    try {
        const res = await fetch(`${API_BASE}/tracking/${orderId}`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || 'Tracking details unavailable.', 'error');
            return;
        }

        const tracking = data.tracking;
        updateTrackingUI(tracking);

    } catch (err) {
        console.error('Error fetching tracking:', err);
    }
}

let hasAnnouncedDelivery = false;

function updateTrackingUI(tracking) {
    if (!tracking) return;

    // Update Text Elements
    if (document.getElementById('track-order-id')) {
        document.getElementById('track-order-id').innerText = tracking.order_id;
    }

    const isDelivered = (tracking.status === 'Delivered');

    if (document.getElementById('track-eta')) {
        document.getElementById('track-eta').innerText = isDelivered ? 'Delivered at Doorstep' : (tracking.eta || '18 mins');
        if (isDelivered) {
            document.getElementById('track-eta').style.color = 'var(--success)';
        }
    }
    if (document.getElementById('track-distance')) {
        document.getElementById('track-distance').innerText = isDelivered ? '0.0 km' : (tracking.distance || '2.4 km');
    }
    if (document.getElementById('track-partner-name')) {
        document.getElementById('track-partner-name').innerText = tracking.partner_name || 'Ramesh Kumar';
    }
    if (document.getElementById('track-partner-phone')) {
        document.getElementById('track-partner-phone').innerText = tracking.partner_phone || '+91 98765 43210';
    }

    // Update Status Pill
    const pill = document.getElementById('track-status-pill');
    if (pill) {
        pill.innerText = tracking.status || 'Out for Delivery';
        if (isDelivered) {
            pill.className = 'badge badge-success';
        } else if (tracking.status === 'Out for Delivery') {
            pill.className = 'badge badge-info';
        } else {
            pill.className = 'badge badge-primary';
        }
    }

    // Update Map Coordinates
    if (tracking.partner_lat && tracking.partner_lng && riderMarker) {
        partnerCoordinates = [tracking.partner_lat, tracking.partner_lng];
        riderMarker.setLatLng(partnerCoordinates);

        if (routePolyline) {
            if (isDelivered) {
                routePolyline.setLatLngs([userCoordinates, userCoordinates]);
            } else {
                routePolyline.setLatLngs([partnerCoordinates, userCoordinates]);
            }
        }
    }

    // Update Status Progression
    updateStatusTimeline(tracking.status);

    // If Delivered, announce and stop polling if finished
    if (isDelivered && !hasAnnouncedDelivery) {
        hasAnnouncedDelivery = true;
        if (window.MedVoice) {
            MedVoice.speak("Your MedConnect medicine order has been delivered successfully. Thank you for choosing MedConnect!");
        }
        showToast('Your order has been delivered successfully!', 'success');
        const btnDeliver = document.getElementById('btn-deliver-now');
        if (btnDeliver) {
            btnDeliver.disabled = true;
            btnDeliver.innerHTML = '<i class="fa-solid fa-check-double"></i> Delivered';
        }
        const btnStep = document.getElementById('btn-step-now');
        if (btnStep) btnStep.disabled = true;
    }
}

function updateStatusTimeline(status) {
    let currentIndex = 3; // Default Out for Delivery
    const norm = (status || '').toLowerCase();

    if (norm === 'delivered') {
        currentIndex = 4;
    } else if (norm.includes('out') || norm.includes('delivery')) {
        currentIndex = 3;
    } else if (norm.includes('ship') || norm.includes('dispatch')) {
        currentIndex = 2;
    } else if (norm.includes('pack')) {
        currentIndex = 1;
    } else if (norm.includes('confirm') || norm.includes('place')) {
        currentIndex = 0;
    }

    for (let idx = 0; idx < 5; idx++) {
        const el = document.getElementById(`step-${idx + 1}`);
        if (!el) continue;

        const dot = el.querySelector('.v-timeline-dot');

        if (idx < currentIndex || (idx === currentIndex && norm === 'delivered')) {
            el.className = 'v-timeline-item done';
            if (dot) dot.innerHTML = '<i class="fa-solid fa-check" style="font-size: 0.65rem; color: white;"></i>';
        } else if (idx === currentIndex) {
            el.className = 'v-timeline-item active';
            if (dot) dot.innerHTML = '<i class="fa-solid fa-truck-fast" style="font-size: 0.65rem; color: var(--primary);"></i>';
        } else {
            el.className = 'v-timeline-item';
            if (dot) dot.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 0.5rem; color: #cbd5e1;"></i>';
        }
    }
}

// User action: Fast-forward / Mark Delivered
async function triggerMarkDelivered() {
    if (!activeOrderId) {
        showToast('No active order selected to deliver.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/tracking/${activeOrderId}/deliver`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();
        if (data.success && data.tracking) {
            updateTrackingUI(data.tracking);
        } else {
            showToast(data.message || 'Could not update status to Delivered.', 'error');
        }
    } catch (e) {
        showToast('Network error while marking delivered.', 'error');
    }
}

// User action: Step Courier Closer
async function triggerStepForward() {
    if (!activeOrderId) {
        showToast('No active order selected.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/tracking/${activeOrderId}/step`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();
        if (data.success && data.tracking) {
            updateTrackingUI(data.tracking);
            showToast('Courier moved closer!', 'info');
        } else {
            showToast(data.message || 'Could not advance courier.', 'error');
        }
    } catch (e) {
        showToast('Network error while advancing courier.', 'error');
    }
}

// Send updated coordinates to backend API
async function updateServerLocation(orderId, lat, lng, role = 'partner') {
    try {
        await fetch(`${API_BASE}/tracking/${orderId}/location`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ latitude: lat, longitude: lng, role })
        });
    } catch (e) {}
}
