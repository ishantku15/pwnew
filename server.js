// AS Multiverse — Local Dev Server
// Run with: node server.js
// Serves static files + proxies PW API requests (no CORS issues)

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 5500;

const FALLBACK_TOKEN = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc";

const PW_HEADERS = {
  "Accept-Encoding": "gzip",
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 11; SM-A707F Build/RP1A.200720.012)",
  "client-id": "ADMIN",
  "client-type": "MOBILE",
  "client-version": "538",
  "content-type": "application/json",
  "device-meta": JSON.stringify({
    APP_VERSION: "538",
    APP_VERSION_NAME: "15.32.0",
    DEVICE_MAKE: "Samsung",
    DEVICE_MODEL: "SM-A707F",
    OS_VERSION: "11",
    PACKAGE_NAME: "xyz.penpencil.physicswala",
    network: "wifi_data",
    carrier: "UNDEFINED"
  }),
  "randomid": "3d3b49f068728fa3",
  "referer": "https://android.pw.live"
};

// Parse JSON body
app.use(express.json());

// --- API: PW Proxy ---
app.get('/api/pw', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing 'url' query parameter" });
  if (!targetUrl.startsWith("https://api.penpencil.co/")) {
    return res.status(403).json({ error: "Only penpencil API URLs allowed" });
  }

  const userToken = req.headers["x-pw-token"] || null;
  const token = userToken ? `Bearer ${userToken}` : FALLBACK_TOKEN;

  try {
    const headers = { ...PW_HEADERS, authorization: token };
    const apiRes = await fetch(targetUrl, { headers });
    const data = await apiRes.json();

    // Extract CloudFront signed cookies
    const rawCookies = apiRes.headers.raw()['set-cookie'] || [];
    const cookiesStr = rawCookies.join('; ');
    const policy = cookiesStr.match(/CloudFront-Policy=([^;,\s]+)/)?.[1];
    const signature = cookiesStr.match(/CloudFront-Signature=([^;,\s]+)/)?.[1];
    const keyPairId = cookiesStr.match(/CloudFront-Key-Pair-Id=([^;,\s]+)/)?.[1];

    // Append signed params to video URL
    if (policy && signature && keyPairId && data?.data?.videoDetails?.videoUrl) {
      const sep = data.data.videoDetails.videoUrl.includes('?') ? '&' : '?';
      data.data.videoDetails.videoUrl += `${sep}Policy=${policy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
    }

    // Also construct videoUrl from key if missing
    if (data?.data?.videoDetails && !data.data.videoDetails.videoUrl && data.data.videoDetails.key) {
      let constructedUrl = `https://d1d34p8vz63oiq.cloudfront.net/${data.data.videoDetails.key}/master.m3u8`;
      if (policy && signature && keyPairId) {
        constructedUrl += `?Policy=${policy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
      }
      data.data.videoDetails.videoUrl = constructedUrl;
    }

    if (apiRes.status === 401 || data?.status === 401) {
      return res.status(401).json({ error: "Token expired", needsLogin: true });
    }

    res.json(data);
  } catch (e) {
    console.error("Proxy error:", e.message);
    res.status(500).json({ error: "Proxy request failed", message: e.message });
  }
});

// --- API: Auth ---
app.post('/api/auth', async (req, res) => {
  const { action, phone, otp, otpType } = req.body || {};
  const PW_BASE = "https://api.penpencil.co";
  const ORG_ID = "5eb393ee95fab7468a79d189";

  const BASE_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 11; SM-A707F Build/RP1A.200720.012)",
    "client-id": "ADMIN",
    "client-type": "MOBILE",
    "client-version": "538",
    "randomid": "3d3b49f068728fa3",
    "referer": "https://android.pw.live"
  };

  try {
    if (action === 'sendOtp') {
      const response = await fetch(`${PW_BASE}/v2/sendOtp`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({ username: phone, countryCode: "+91", organizationId: ORG_ID })
      });
      const data = await response.json();
      return res.status(response.ok ? 200 : 400).json(data);
    }

    if (action === 'verifyOtp') {
      const response = await fetch(`${PW_BASE}/v2/verifyOtp`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({ username: phone, otp, client_type: "WEB", organizationId: ORG_ID, otpType: otpType || "sms" })
      });
      const data = await response.json();
      if (data.success && data.data && data.data.token) {
        return res.json({
          success: true,
          token: data.data.token,
          user: { name: `${data.data.firstName || ""} ${data.data.lastName || ""}`.trim(), username: data.data.username || phone }
        });
      }
      return res.status(400).json(data);
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (e) {
    res.status(500).json({ error: "Auth request failed", message: e.message });
  }
});

// --- API: Media (dedicated video endpoint) ---
app.get('/api/media', async (req, res) => {
  const { batchId, subjectId, scheduleId } = req.query;
  if (!batchId || !subjectId || !scheduleId) {
    return res.status(400).json({ error: "Missing params" });
  }

  const userToken = req.headers["x-pw-token"] || null;
  const token = userToken ? `Bearer ${userToken}` : FALLBACK_TOKEN;
  const headers = { ...PW_HEADERS, authorization: token };

  try {
    // Try v2 first
    let apiRes = await fetch(`https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents/${scheduleId}`, { headers });
    let data = await apiRes.json();

    if (!data || !data.success) {
      apiRes = await fetch(`https://api.penpencil.co/v1/batches/${batchId}/subject/${subjectId}/schedule/${scheduleId}`, { headers });
      data = await apiRes.json();
    }

    if (!data || !data.success || !data.data) {
      return res.status(404).json({ error: "Content not found", raw: data });
    }

    const item = data.data;
    const vd = item.videoDetails || {};

    // Extract CloudFront cookies
    const rawCookies = apiRes.headers.raw()['set-cookie'] || [];
    const cookiesStr = rawCookies.join('; ');
    const policy = cookiesStr.match(/CloudFront-Policy=([^;,\s]+)/)?.[1];
    const signature = cookiesStr.match(/CloudFront-Signature=([^;,\s]+)/)?.[1];
    const keyPairId = cookiesStr.match(/CloudFront-Key-Pair-Id=([^;,\s]+)/)?.[1];

    let videoUrl = vd.videoUrl || '';
    if (!videoUrl && vd.key) {
      videoUrl = `https://d1d34p8vz63oiq.cloudfront.net/${vd.key}/master.m3u8`;
    }
    if (videoUrl && policy && signature && keyPairId) {
      const sep = videoUrl.includes('?') ? '&' : '?';
      videoUrl += `${sep}Policy=${policy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
    }

    res.json({
      success: true,
      videoUrl,
      embedUrl: vd.embedUrl || null,
      title: item.topic || vd.name || '',
      date: item.date || item.startTime || '',
      duration: vd.duration || '',
      key: vd.key || null,
      homeworkIds: item.homeworkIds || [],
      rawVideoDetails: vd
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch", message: e.message });
  }
});

// --- Serve static files ---
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

// --- Fallback: serve index.html for clean URLs ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/batches', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/subjects', (req, res) => res.sendFile(path.join(__dirname, 'subjects.html')));
app.get('/content', (req, res) => res.sendFile(path.join(__dirname, 'content.html')));
app.get('/stream', (req, res) => res.sendFile(path.join(__dirname, 'stream.html')));
app.get('/schedule-details', (req, res) => res.sendFile(path.join(__dirname, 'schedule-details.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.listen(PORT, () => {
  console.log(`\n  AS Multiverse — Dev Server`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  API proxy active at /api/pw`);
  console.log(`  Auth endpoint at /api/auth`);
  console.log(`  Media endpoint at /api/media\n`);
});
