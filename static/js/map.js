// HarvestLanka Map & Dispatch Logic

let map;
let driverMarkers = {};
let driverCircles = [];
let orderMarkers = {};
let selectedOrderIdForMap = null;
let activeAnimations = {}; // keyed by orderId

// Zone Pencil filtering variables
let filterCircle = null;

// Standard coordinates for cities to plot order delivery destinations
const cityCoordinatesMap = {
    "Anuradhapura": [8.3122, 80.4131],
    "Colombo": [6.9271, 79.8612],
    "Kandy": [7.2906, 80.6337],
    "Galle": [6.0535, 80.2117],
    "Jaffna": [9.6615, 80.0095],
    "Kurunegala": [7.4863, 80.3647],
    "Ratnapura": [6.6828, 80.3992],
    "Batticaloa": [7.7172, 81.7010],
    "Badulla": [6.9934, 81.0550],
    "Matara": [5.9549, 80.5550]
};

// Initialize Map
function initDispatchMap() {
    if (map) return; // already initialized
    
    // Center of Sri Lanka coordinates
    map = L.map('map').setView([7.8731, 80.7718], 7.5);

    // Load beautiful carto db voyager light tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Plot all 10 warehouses
    const warehouses = [
        { name: "Colombo Hub (Main Branch)", coords: [6.9271, 79.8612] },
        { name: "Anuradhapura Hub", coords: [8.3122, 80.4131] },
        { name: "Kandy Hub", coords: [7.2906, 80.6337] },
        { name: "Galle Hub", coords: [6.0535, 80.2117] },
        { name: "Jaffna Hub", coords: [9.6615, 80.0095] },
        { name: "Kurunegala Hub", coords: [7.4863, 80.3647] },
        { name: "Ratnapura Hub", coords: [6.6828, 80.3992] },
        { name: "Batticaloa Hub", coords: [7.7172, 81.7010] },
        { name: "Badulla Hub", coords: [6.9934, 81.0550] },
        { name: "Matara Hub", coords: [5.9549, 80.5550] }
    ];

    warehouses.forEach(wh => {
        const warehouseIcon = L.divIcon({
            className: 'warehouse-map-icon',
            html: `<div style="background: rgba(245, 158, 11, 0.25); border: 2.5px solid #f59e0b; width: 34px; height: 34px; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-size: 1.25rem; box-shadow: 0 0 12px rgba(245, 158, 11, 0.5); transition: all 0.3s ease;">🏪</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        L.marker(wh.coords, { icon: warehouseIcon })
            .addTo(map)
            .bindPopup(`<div style="color:#0f172a; font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:0.9rem; padding: 4px;">
                            🏢 ${wh.name}
                        </div>`);
    });

    // Setup Leaflet Draw for the Circle tool only
    const drawControl = new L.Control.Draw({
        draw: {
            polyline: false,
            polygon: false,
            rectangle: false,
            marker: false,
            circlemarker: false,
            circle: {
                shapeOptions: {
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '5, 5'
                }
            }
        },
        edit: false // disable edit toolbar
    });
    map.addControl(drawControl);

    // Map Event Handler for Draw Created
    map.on(L.Draw.Event.CREATED, function (e) {
        if (filterCircle) {
            map.removeLayer(filterCircle);
        }
        
        filterCircle = e.layer;
        map.addLayer(filterCircle);
        
        showToast("Zone drawn successfully. Available drivers filtered!", "success");
        filterDriversOnMap();
        updateFilteredDriversSidebar();
    });

    // Option to clear the circle if user draws a new one, handled above.
}

function clearFilterCircle() {
    if (filterCircle) {
        map.removeLayer(filterCircle);
        filterCircle = null;
        updateFilteredDriversSidebar();
    }
}

// Update the "Drivers in Zone" sidebar
function updateFilteredDriversSidebar() {
    const list = document.getElementById("filteredDriversList");
    if (!list) return;
    list.innerHTML = "";

    if (!filterCircle) {
        list.innerHTML = `<div style="text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.85rem;">Use the Circle tool on the map to find available drivers near an order.</div>`;
        return;
    }

    const center = filterCircle.getLatLng();
    const radius = filterCircle.getRadius();
    
    const availableDriversInZone = driversGlobal.filter(d => {
        if (d.status !== 'available') return false;
        const dLatLng = L.latLng(d.lat, d.lng);
        return center.distanceTo(dLatLng) <= radius;
    });

    if (availableDriversInZone.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.85rem;">No available drivers found in this zone.</div>`;
        return;
    }

    availableDriversInZone.forEach(d => {
        const vehicleEmoji = getVehicleIcon(d.vehicle_type || 'Motorbike');
        const card = document.createElement("div");
        card.className = "glass-card";
        card.style.padding = "0.75rem";
        card.style.marginBottom = "0.75rem";
        card.style.borderLeftWidth = "4px";
        card.style.borderLeftColor = "#10b981"; // Green for available

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                <span style="font-weight:700; font-size:0.9rem;">${vehicleEmoji} ${d.username}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">
                ${d.warehouse} &bull; ${d.vehicle_type}
            </div>
            <button class="btn btn-secondary btn-block" style="padding:0.4rem; font-size:0.8rem;" onclick="offerJobToFilteredDriver(${d.user_id})">
                Offer Job
            </button>
        `;
        list.appendChild(card);
    });
}

// Handler for the sidebar "Offer Job" button
function offerJobToFilteredDriver(driverId) {
    const pendingOrders = pendingOrdersGlobal.filter(o => o.status === 'pending');
    if (pendingOrders.length === 0) {
        showToast("There are no pending orders to assign.", "info");
        return;
    }
    
    // Default to the focused order if set, otherwise first pending
    let orderToAssign = pendingOrders[0];
    if (selectedOrderIdForMap) {
        const focused = pendingOrders.find(o => o.id === selectedOrderIdForMap);
        if (focused) orderToAssign = focused;
    }

    // Direct offer simulation (Pizza-Hut style)
    simulateJobOfferWorkflow(orderToAssign.id, driverId);
}

// Simulate the complete workflow: Accept -> Status Change -> SMS -> Live Track
async function simulateJobOfferWorkflow(orderId, driverId) {
    // 1. Mark as accepted on backend
    try {
        await fetch(`/api/orders/${orderId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driver_id: driverId })
        });
        await fetch(`/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'delivering' }) // jump to delivering for sim
        });
        
        // SMS Mockup alert
        alert(`SMS sent to customer:\n\n"Your CEYLEX order is on the way! Track live here:\nhttp://ceylex.lk/track/${orderId}"`);

        showToast(`Job accepted by driver. Dispatching now!`, "success");
        
        // Refresh data which will trigger `simulateDriverMovement`
        loadDispatchData(); 
    } catch(e) {
        console.error(e);
    }
}


// Core function to load drivers and pending orders
async function loadDispatchData() {
    initDispatchMap();

    try {
        // 1. Fetch Drivers
        const driverRes = await fetch('/api/drivers');
        driversGlobal = await driverRes.json();

        // 2. Fetch Orders
        const orderRes = await fetch('/api/orders');
        const orders = await orderRes.json();
        pendingOrdersGlobal = orders.filter(o => o.status === 'pending' || o.status === 'offered' || o.status === 'accepted' || o.status === 'delivering');

        // Check for active delivering transit order simulation
        orders.forEach(o => {
            if (o.status === 'delivering' && o.driver_id) {
                const driver = driversGlobal.find(d => d.user_id === o.driver_id);
                const orderCoords = cityCoordinatesMap[o.address_line2];
                if (driver && orderCoords) {
                    const start = [driver.lat, driver.lng];
                    const end = orderCoords;
                    simulateDriverMovement(o.id, driver.user_id, start, end);
                }
            }
        });

        // Update active drivers counter on dashboard if element exists
        const countEl = document.getElementById("active-vehicles-counter");
        if (countEl) {
            const availableCount = driversGlobal.filter(d => d.status === 'available').length;
            countEl.innerText = `${availableCount} Available`;
        }

        renderPendingOrdersList();
        renderDriversOnMap();
        renderOrdersOnMap();

    } catch (err) {
        console.error("Failed to load dispatch data: ", err);
    }
}

// Render Orders List on Sidebar
function renderPendingOrdersList() {
    const list = document.getElementById("pendingOrdersList");
    if (!list) return;
    list.innerHTML = "";

    if (pendingOrdersGlobal.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 3rem 0; color: var(--text-muted); font-size: 0.9rem;">
                No pending or active orders.
            </div>
        `;
        return;
    }

    pendingOrdersGlobal.forEach(o => {
        const isOffered = o.status === 'offered';
        const isAccepted = o.status === 'accepted';
        
        const card = document.createElement("div");
        card.className = "glass-card";
        card.style.padding = "1rem";
        card.style.marginBottom = "1rem";
        card.style.cursor = "pointer";
        card.style.borderLeftWidth = "4px";
        
        if (o.status === 'pending') card.style.borderLeftColor = "var(--secondary)";
        else if (isOffered) card.style.borderLeftColor = "#3b82f6";
        else card.style.borderLeftColor = "var(--primary)";

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.85rem;">
                <span style="font-weight:800; color:var(--secondary);">#ORD-${o.id}</span>
                <span class="badge badge-${o.status}">${o.status.toUpperCase()}</span>
            </div>
            <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">
                ${o.address_line1}, ${o.address_line2}
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">
                <span>Weight: ${o.total_weight.toFixed(1)} kg</span>
                <span>Vehicle: ${o.suggested_vehicle}</span>
            </div>
            
            ${o.status === 'pending' ? `
                <button class="btn btn-secondary btn-block" style="padding:0.4rem; font-size:0.8rem;" onclick="assignDriverClicked(${o.id})">
                    Select Driver & Dispatch
                </button>
            ` : `
                <div style="font-size:0.75rem; color:var(--text-muted); text-align:right; margin-bottom: 0.5rem;">
                    Assigned: <strong>${o.driver_name || 'Driver'}</strong>
                </div>
                <button class="btn btn-outline btn-block" style="padding:0.4rem; font-size:0.8rem; border-color: var(--secondary); color: var(--secondary);" onclick="window.open('/track/${o.id}', '_blank')">
                    <i class="fa-solid fa-location-crosshairs"></i> Open Live Tracking
                </button>
            `}
        `;

        // Click on order card zooms/centers on the order's delivery city
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                focusOrderOnMap(o.address_line2, o.id);
            }
        });

        list.appendChild(card);
    });
}

// Center map on order destination
function focusOrderOnMap(cityName, orderId) {
    const coords = cityCoordinatesMap[cityName];
    if (coords) {
        selectedOrderIdForMap = orderId;
        map.setView(coords, 10);
        
        // Pulse order marker if exists
        if (orderMarkers[orderId]) {
            orderMarkers[orderId].openPopup();
        }
    }
}

// Render Drivers markers on Map
function renderDriversOnMap() {
    // Clear old driver markers and circles
    Object.values(driverMarkers).forEach(m => map.removeLayer(m));
    driverMarkers = {};
    driverCircles.forEach(c => map.removeLayer(c));
    driverCircles = [];

    driversGlobal.forEach(d => {
        // Choose color based on status
        let markerColor = "#9ca3af"; // Grey (offline)
        if (d.status === 'available') markerColor = "#10b981"; // Green
        else if (d.status === 'busy' || d.status === 'returning') markerColor = "#f59e0b"; // Yellow/Orange

        // Check if filter is active, filter driver list
        if (filterCircle && d.status === 'available') {
            const driverLatLng = L.latLng(d.lat, d.lng);
            const center = filterCircle.getLatLng();
            const radius = filterCircle.getRadius();
            if (center.distanceTo(driverLatLng) > radius) {
                // Skip rendering if driver is outside of selection circle
                return;
            }
        }

        // Draw delivery radius circle overlay on map for available drivers
        if (d.status === 'available') {
            const radiusMeters = (d.delivery_radius || 50.0) * 1000;
            const circle = L.circle([d.lat, d.lng], {
                radius: radiusMeters,
                color: '#C5A059',
                fillColor: '#C5A059',
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: '3, 4'
            }).addTo(map);
            driverCircles.push(circle);
        }

        const vehicleEmoji = getVehicleIcon(d.vehicle_type || 'Motorbike');
        
        // Draw styled divIcon for drivers instead of simple circle
        const markerIcon = L.divIcon({
            className: 'driver-map-icon',
            html: `<div style="background: ${markerColor}; border: 2px solid #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 0.95rem; box-shadow: 0 0 8px ${markerColor}80; transition: all 0.3s ease; cursor: pointer;">${vehicleEmoji}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([d.lat, d.lng], { icon: markerIcon }).addTo(map);

        // Map popup details
        let popupHtml = `
            <div style="color:#0f172a; font-family:'Plus Jakarta Sans',sans-serif; min-width:180px; font-size: 0.85rem;">
                <div style="font-weight:800; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:8px; font-size:0.95rem; color:#0f172a;">
                    ${vehicleEmoji} ${d.username}
                </div>
                <div style="font-size:0.8rem; margin-bottom:4px;">
                    <strong>Status:</strong> <span style="color:${markerColor}; font-weight:700;">${d.status.toUpperCase()}</span>
                </div>
                <div style="font-size:0.8rem; margin-bottom:4px;">
                    <strong>Warehouse:</strong> ${d.warehouse || d.area + ' Hub'}
                </div>
                <div style="font-size:0.8rem; margin-bottom:4px;">
                    <strong>Vehicle Type:</strong> ${d.vehicle_type || 'Motorbike'}
                </div>
                <div style="font-size:0.8rem; margin-bottom:4px;">
                    <strong>License No:</strong> ${d.license_no || 'N/A'}
                </div>
                <div style="font-size:0.8rem; margin-bottom:4px;">
                    <strong>Home Address:</strong> ${d.home_address || 'N/A'}
                </div>
                <div style="font-size:0.8rem; margin-bottom:8px;">
                    <strong>Phone:</strong> ${d.phone || 'N/A'}
                </div>
        `;

        if (d.status === 'available') {
            popupHtml += `
                <button onclick="dispatchToDriverFromMap(${d.user_id})" 
                        style="width:100%; border:none; background:#10b981; color:#fff; font-weight:700; border-radius:4px; padding:6px 0; cursor:pointer; font-family:'Plus Jakarta Sans'; font-size:0.8rem;">
                    Offer Job
                </button>
            `;
        }
        popupHtml += `</div>`;

        marker.bindPopup(popupHtml);
        driverMarkers[d.user_id] = marker;
    });
}

// Render Order destination markers on Map
function renderOrdersOnMap() {
    // Clear old order markers
    Object.values(orderMarkers).forEach(m => map.removeLayer(m));
    orderMarkers = {};

    pendingOrdersGlobal.forEach(o => {
        const coords = cityCoordinatesMap[o.address_line2];
        if (!coords) return;

        // Custom icon representing a Red House Pin
        const houseIconHtml = `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">🏠</div>`;
        const pulseMarker = L.divIcon({
            className: 'order-house-icon',
            html: houseIconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 32], // Anchor at bottom center
            popupAnchor: [0, -32]
        });

        const marker = L.marker(coords, { icon: pulseMarker }).addTo(map);

        const popupHtml = `
            <div style="color:#0f172a; font-family:'Plus Jakarta Sans',sans-serif; font-size:0.85rem;">
                <div style="font-weight:700; color:#ef4444;">📦 Pending Order #ORD-${o.id}</div>
                <div><strong>Address:</strong> ${o.address_line1}, ${o.address_line2}</div>
                <div><strong>Weight:</strong> ${o.total_weight.toFixed(1)} kg</div>
                <div><strong>Suggested transport:</strong> ${o.suggested_vehicle}</div>
            </div>
        `;

        marker.bindPopup(popupHtml);
        orderMarkers[o.id] = marker;
    });
}

// Triggered when driver is clicked on map popup
function dispatchToDriverFromMap(driverId) {
    // If manager has clicked dispatch on map, we check if they selected an order first
    const pendingOrders = pendingOrdersGlobal.filter(o => o.status === 'pending');
    
    if (pendingOrders.length === 0) {
        showToast("There are no pending orders to assign.", "info");
        return;
    }

    // Default to the first pending order or currently focused order
    let orderToAssign = pendingOrders[0];
    if (selectedOrderIdForMap) {
        const focused = pendingOrders.find(o => o.id === selectedOrderIdForMap);
        if (focused) orderToAssign = focused;
    }

    // Check if driver radius covers the order location
    const driver = driversGlobal.find(d => d.user_id === driverId);
    if (driver) {
        const orderCoords = cityCoordinatesMap[orderToAssign.address_line2];
        if (orderCoords) {
            const orderLatLng = L.latLng(orderCoords[0], orderCoords[1]);
            const driverLatLng = L.latLng(driver.lat, driver.lng);
            const distanceMeters = driverLatLng.distanceTo(orderLatLng);
            const maxRadiusMeters = (driver.delivery_radius || 50.0) * 1000;
            if (distanceMeters > maxRadiusMeters) {
                showToast(`This driver's delivery radius (${driver.delivery_radius}km) does not cover the selected order location (${orderToAssign.address_line2}).`, "warning");
                return;
            }
        }
    }

    map.closePopup();
    openAssignDriverModal(orderToAssign.id);
    
    // Pre-select the clicked driver in the modal dropdown
    setTimeout(() => {
        document.getElementById("selectDriverOption").value = driverId;
    }, 100);
}

// Triggered when "Select Driver & Dispatch" button clicked on order sidebar card
function assignDriverClicked(orderId) {
    selectedOrderIdForMap = orderId;
    openAssignDriverModal(orderId);
}

// Refresh markers and filters
function filterDriversOnMap() {
    renderDriversOnMap();
}

function simulateDriverMovement(orderId, driverId, startLatLng, endLatLng) {
    if (activeAnimations[orderId]) return; // already animating

    // Create a temporary animated delivery vehicle marker on the map
    const vehicleEmoji = "🚚";
    const animIcon = L.divIcon({
        className: 'driver-anim-icon',
        html: `<div style="background: #1B4D3E; border: 2.5px solid #C5A059; width: 32px; height: 32px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.1rem; box-shadow: 0 0 15px rgba(27,77,62,0.6); z-index: 9999;">${vehicleEmoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const animatedMarker = L.marker(startLatLng, { icon: animIcon }).addTo(map);
    
    // Draw transit polyline route
    const routeLine = L.polyline([startLatLng, endLatLng], {
        color: '#C5A059',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 10'
    }).addTo(map);

    let steps = 40;
    let step = 0;
    let intervalTime = 250; // Total duration 10 seconds

    activeAnimations[orderId] = {
        marker: animatedMarker,
        line: routeLine
    };

    const timer = setInterval(async () => {
        step++;
        if (step > steps) {
            clearInterval(timer);
            // Animation finished
            map.removeLayer(animatedMarker);
            map.removeLayer(routeLine);
            delete activeAnimations[orderId];
            
            // Update backend status so it doesn't replay
            try {
                fetch(`/api/orders/${orderId}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' })
                });
            } catch(e) {}
        } else {
            // Calculate intermediate coordinate
            const ratio = step / steps;
            const nextLat = startLatLng[0] + (endLatLng[0] - startLatLng[0]) * ratio;
            const nextLng = startLatLng[1] + (endLatLng[1] - startLatLng[1]) * ratio;
            animatedMarker.setLatLng([nextLat, nextLng]);
            
            // Simulating real-time driver coordinate update on the backend as they transit
            if (step % 10 === 0 && step < steps) {
                try {
                    await fetch('/api/drivers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            driver_id: driverId,
                            lat: nextLat,
                            lng: nextLng
                        })
                    });
                } catch (e) {
                    console.error("Failed to update driver live transit coords", e);
                }
            }
        }
    }, intervalTime);
}

function getVehicleIcon(v) {
    if (!v) return '🛵';
    const val = v.toLowerCase();
    if (val.includes('motorbike')) return '🛵';
    if (val.includes('three-wheeler')) return '🛺';
    if (val.includes('van')) return '🚐';
    return '🚚';
}
