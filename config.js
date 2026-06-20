// AS Multiverse — Shared Configuration
// Works with: node server.js (local dev) OR Vercel deployment

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

/**
 * Universal PW API fetcher
 * Strategy:
 * 1. Always try /api/pw proxy first (works on Vercel, handles CORS)
 * 2. If proxy returns needsLogin OR errors → try again with no user token (force fallback on server)
 * 3. Last resort: direct fetch (only works locally/if CORS allowed)
 */
async function pw(url) {
  const userToken = getToken();
  const reqHeaders = {};
  if (userToken) reqHeaders['X-PW-Token'] = userToken;

  // ── Attempt 1: proxy with user token ──
  try {
    const res = await fetch('/api/pw?url=' + encodeURIComponent(url), {
      headers: reqHeaders,
      signal: AbortSignal.timeout(12000)
    });

    if (res.ok) {
      const data = await res.json();
      // If proxy says needsLogin, retry without user token so server uses FALLBACK
      if (data.needsLogin) throw new Error('needsLogin');
      return data;
    }

    // 401 → retry without user token
    if (res.status === 401) throw new Error('token-expired');

    throw new Error('proxy-failed:' + res.status);

  } catch (err) {
    // ── Attempt 2: proxy WITHOUT user token (forces server FALLBACK_TOKEN) ──
    try {
      const res2 = await fetch('/api/pw?url=' + encodeURIComponent(url), {
        signal: AbortSignal.timeout(12000)
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (!data2.needsLogin) return data2;
      }
    } catch (_) {}

    // ── Attempt 3: direct fetch (local dev only — CORS blocked on production) ──
    try {
      const directHeaders = { ...PW_DIRECT_HEADERS };
      if (userToken) directHeaders['authorization'] = 'Bearer ' + userToken;
      const res3 = await fetch(url, {
        headers: directHeaders,
        signal: AbortSignal.timeout(12000)
      });
      if (res3.ok) return await res3.json();
    } catch (_) {}

    console.error('[pw] All fetch attempts failed for:', url);
    return null;
  }
}

/**
 * Auth API caller
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
