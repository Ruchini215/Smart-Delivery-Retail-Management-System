// HarvestLanka Global Frontend Controller

// --- POPUP TOAST SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    // Create Toast Element
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on toast type
    let icon = "🔔";
    if (type === "success") icon = "✅";
    if (type === "info") icon = "💡";
    if (type === "danger") icon = "⚠️";

    toast.innerHTML = `
        <div style="font-size:1.25rem;">${icon}</div>
        <div class="toast-message">${message}</div>
        <div class="toast-close" onclick="this.parentElement.remove()">×</div>
    `;

    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- AUTHENTICATION ACTION HANDLERS ---

// 1. Submit Login Credentials
async function handleLogin(event) {
    event.preventDefault();
    const usernameVal = document.getElementById("loginUsername").value.trim();
    const passwordVal = document.getElementById("loginPassword").value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameVal,
                password: passwordVal
            })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Welcome back! Signing in...", "success");
            // Redirect based on role
            setTimeout(() => {
                if (result.role === 'manager') window.location.href = '/manager';
                else if (result.role === 'driver') window.location.href = '/driver';
                else window.location.href = '/';
            }, 800);
        } else {
            showToast(result.message || "Invalid username or password.", "danger");
        }
    } catch (err) {
        showToast("Unable to connect to backend server.", "danger");
    }
}

// 2. Submit Registration Form
async function handleRegister(event) {
    event.preventDefault();
    const usernameVal = document.getElementById("registerUsername").value.trim();
    const passwordVal = document.getElementById("registerPassword").value;
    const roleVal = document.getElementById("registerRole").value;
    
    // Build payload
    const payload = {
        username: usernameVal,
        password: passwordVal,
        role: roleVal
    };

    // Add driver specific parameters if driver role is selected
    if (roleVal === "driver") {
        const phone = document.getElementById("driverPhone").value.trim();
        const license = document.getElementById("driverLicense").value.trim();
        const homeAddr = document.getElementById("driverHomeAddress").value.trim();
        
        // Validation Checks
        if (!/^0\d{9}$/.test(phone)) {
            showToast("Mobile number must be exactly 10 digits (numbers only) starting with 0.", "danger");
            return;
        }
        
        if (!/^[A-Z0-9]{7,9}$/.test(license)) {
            showToast("License number must be 7 to 9 alphanumeric characters.", "danger");
            return;
        }

        if (homeAddr.length < 5) {
            showToast("Please enter a valid home address.", "danger");
            return;
        }

        payload.phone = phone;
        payload.license_no = license;
        payload.home_address = homeAddr;
        payload.area = document.getElementById("driverArea").value;
        payload.vehicle_type = document.getElementById("driverVehicle").value;
        payload.delivery_radius = parseFloat(document.getElementById("driverRadius").value || 50.0);
        payload.lat = parseFloat(document.getElementById("driverLat").value);
        payload.lng = parseFloat(document.getElementById("driverLng").value);

        if (!payload.phone) {
            showToast("Phone number is required for drivers.", "info");
            return;
        }
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Account created successfully! Please sign in.", "success");
            // Switch tabs back to login
            setTimeout(() => {
                showAuthTab('login');
                // Clear forms
                document.getElementById("registerForm").reset();
                if (roleVal === "driver") {
                    document.getElementById("driverFields").style.display = "none";
                }
            }, 1000);
        } else {
            showToast(result.message || "Registration failed.", "danger");
        }
    } catch (err) {
        showToast("Unable to connect to backend server.", "danger");
    }
}

// --- SYSTEM SPLASH SCREEN MULTI-STAGE LOADER ---
function runSplashLoader() {
    const loader = document.getElementById("splash-loader");
    const bar = document.getElementById("splashProgressBar");
    const percentText = document.getElementById("splashPercentage");
    const statusText = document.getElementById("splashStatusText");
    
    if (!loader) return;
    
    if (!bar || !percentText || !statusText) {
        // Fallback for simple/un-migrated loaders
        setTimeout(() => {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
        }, 1000);
        return;
    }
    
    let progress = 0;
    const duration = 1200; // Total loader display duration in milliseconds
    const intervalTime = 20; // Step timer interval in milliseconds
    const totalSteps = duration / intervalTime;
    const stepIncrement = 100 / totalSteps;
    
    const loadingSteps = [
        { threshold: 20, text: "INITIALIZING CEYLEX SECURE NODE..." },
        { threshold: 45, text: "RESOLVING GEOSPATIAL LOGISTICS LAYERS..." },
        { threshold: 70, text: "OPTIMIZING VEHICLE DISPATCH COEFFICIENTS..." },
        { threshold: 85, text: "ESTABLISHING SECURE REAL-TIME DATA CHANNELS..." },
        { threshold: 95, text: "FETCHING ACTIVE INVENTORY MATRIX..." },
        { threshold: 100, text: "SYSTEM COMPILING SUCCESSFUL. BOOTING..." }
    ];
    
    const interval = setInterval(() => {
        progress += stepIncrement;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            bar.style.width = "100%";
            percentText.innerText = "100%";
            statusText.innerText = "SYSTEM COMPILING SUCCESSFUL. BOOTING...";
            
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.visibility = 'hidden';
            }, 300);
        } else {
            const currentPercentage = Math.floor(progress);
            bar.style.width = `${currentPercentage}%`;
            percentText.innerText = `${currentPercentage}%`;
            
            const step = loadingSteps.find(s => currentPercentage <= s.threshold);
            if (step) {
                statusText.innerText = step.text;
            }
        }
    }, intervalTime);
}

// Run loader as soon as script runs or document is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSplashLoader);
} else {
    runSplashLoader();
}

