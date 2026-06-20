// AS Multiverse — PW API Proxy
// Token priority: 1) User token (from login) 2) Environment variable 3) Hardcoded fallback

let cachedToken = null;
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Fallback token — long-lived JWT for anonymous access
const FALLBACK_TOKEN = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc";

const PW_HEADERS_BASE = {
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

function getToken(userToken) {
  // Priority 1: User-provided token from PW login
  if (userToken) return userToken;

  // Priority 2: Cached token from a previous successful login
  if (cachedToken && (Date.now() - cacheTime) < CACHE_DURATION) {
    return cachedToken;
  }

  // Priority 3: Environment variable (set in Vercel dashboard)
  if (process.env.PW_TOKEN) {
    return process.env.PW_TOKEN.startsWith("Bearer ")
      ? process.env.PW_TOKEN
      : `Bearer ${process.env.PW_TOKEN}`;
  }

  // Priority 4: Stale cached token
  if (cachedToken) return cachedToken;

  // Priority 5: Hardcoded fallback
  return FALLBACK_TOKEN;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-PW-Token,Authorization");
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  // Validate URL — only allow penpencil API
  if (!targetUrl.startsWith("https://api.penpencil.co/")) {
    return res.status(403).json({ error: "Only penpencil API URLs allowed" });
  }

  // Get token — user token from header takes priority
  const userToken = req.headers["x-pw-token"] || null;
  const token = getToken(userToken ? `Bearer ${userToken}` : null);

  if (!token) {
    return res.status(401).json({
      error: "No auth token available",
      needsLogin: true,
      message: "Please login with your PW account"
    });
  }

  try {
    const headers = { ...PW_HEADERS_BASE, authorization: token };
    const apiRes = await fetch(targetUrl, { headers });

    // Handle non-JSON responses gracefully
    const contentType = apiRes.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await apiRes.text();
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(apiRes.status).json({
        success: false,
        error: "Non-JSON response from upstream",
        status: apiRes.status,
        body: text.substring(0, 500)
      });
    }

    const data = await apiRes.json();

    // Extract CloudFront signed cookies and append to video URL
    const cookieHeaders = apiRes.headers.get("set-cookie") || "";
    const policy = cookieHeaders.match(/CloudFront-Policy=([^;,\s]+)/)?.[1];
    const signature = cookieHeaders.match(/CloudFront-Signature=([^;,\s]+)/)?.[1];
    const keyPairId = cookieHeaders.match(/CloudFront-Key-Pair-Id=([^;,\s]+)/)?.[1];

    if (policy && signature && keyPairId) {
      // Append to videoUrl if present
      if (data?.data?.videoDetails?.videoUrl) {
        const sep = data.data.videoDetails.videoUrl.includes("?") ? "&" : "?";
        data.data.videoDetails.videoUrl += `${sep}Policy=${policy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
      }
    }

    // If 401, clear cache and signal need for login
    if (apiRes.status === 401 || data?.status === 401) {
      cachedToken = null;
      cacheTime = 0;
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(401).json({
        error: "Token expired",
        needsLogin: true,
        message: "Token expired. Please login again."
      });
    }

    // Cache a successful user token for future requests
    if (userToken && apiRes.status === 200) {
      cachedToken = `Bearer ${userToken}`;
      cacheTime = Date.now();
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-PW-Token,Authorization");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (e) {
    console.error("Proxy error:", e.message);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: "Proxy request failed", message: e.message });
  }
}
