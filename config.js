// AS Multiverse — Shared Configuration
// Works with: node server.js (local dev) OR Vercel deployment

const FALLBACK_TOKEN = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc";

const DIRECT_HEADERS = {
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

/**
 * Universal PW API fetcher
 * 1. Tries /api/pw proxy first (works on server)
 * 2. Falls back to direct PW API with master token (works locally or if proxy fails)
 */
async function pw(url) {
  const token = getToken();
  const headers = {};
  if (token) headers['X-PW-Token'] = token;

  try {
    const res = await fetch('/api/pw?url=' + encodeURIComponent(url), { headers });
    if (res.ok) {
      const data = await res.json();
      if (!data.needsLogin) return data;
      // proxy said needsLogin — fall through to direct fetch
      throw new Error('needsLogin');
    }
    throw new Error('proxy-failed:' + res.status);
  } catch (err) {
    // Direct fallback to PW API with master token
    try {
      const directHeaders = { ...DIRECT_HEADERS };
      if (token) directHeaders['authorization'] = 'Bearer ' + token;
      const dirRes = await fetch(url, { headers: directHeaders });
      if (dirRes.ok) return await dirRes.json();
      console.error('Direct fetch failed:', dirRes.status);
      return null;
    } catch (e) {
      console.error('Both proxy and direct fetch failed:', e);
      return null;
    }
  }
}

/**
 * Auth API caller for login
 */
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
