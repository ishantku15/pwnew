// AS Multiverse — Shared Configuration

const FALLBACK_TOKEN = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc";

const PW_DIRECT_HEADERS = {
  "User-Agent": "Dalvik/2.1.0",
  "client-id": "ADMIN",
  "client-type": "MOBILE",
  "client-version": "538",
  "device-meta": '{"APP_VERSION":"538","APP_VERSION_NAME":"15.32.0","DEVICE_MAKE":"Samsung","DEVICE_MODEL":"SM-A707F","OS_VERSION":"11","PACKAGE_NAME":"xyz.penpencil.physicswala","network":"wifi_data","carrier":"UNDEFINED"}',
  "authorization": FALLBACK_TOKEN
};

function getToken() {
  return localStorage.getItem('pw_token') || '';
}

// Simple timeout wrapper compatible with all browsers
function fetchWithTimeout(url, opts, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms || 10000);
    fetch(url, opts).then(r => { clearTimeout(t); resolve(r); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

/**
 * Universal PW API fetcher — 3-tier strategy:
 * 1. /api/pw proxy with user token (works on Vercel)
 * 2. /api/pw proxy WITHOUT token (forces server to use FALLBACK_TOKEN)
 * 3. Direct fetch to PW API (works locally only)
 */
async function pw(url) {
  const userToken = getToken();

  // ── Tier 1: proxy with user token ──
  try {
    const headers = {};
    if (userToken) headers['X-PW-Token'] = userToken;
    const res = await fetchWithTimeout('/api/pw?url=' + encodeURIComponent(url), { headers }, 10000);
    const data = await res.json();
    if (!data.needsLogin) return data;
  } catch (_) {}

  // ── Tier 2: proxy WITHOUT token (server uses FALLBACK_TOKEN) ──
  try {
    const res = await fetchWithTimeout('/api/pw?url=' + encodeURIComponent(url), {}, 10000);
    const data = await res.json();
    if (!data.needsLogin) return data;
  } catch (_) {}

  // ── Tier 3: direct fetch (local dev) ──
  try {
    const headers = { ...PW_DIRECT_HEADERS };
    if (userToken) headers['authorization'] = 'Bearer ' + userToken;
    const res = await fetchWithTimeout(url, { headers }, 10000);
    return await res.json();
  } catch (_) {}

  console.warn('[AS] All fetch tiers failed:', url);
  return null;
}

async function pwAuth(action, phone, otp, otpType) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, phone, otp, otpType })
    });
    return await res.json();
  } catch (e) {
    return { error: 'Network error', message: e.message };
  }
}
