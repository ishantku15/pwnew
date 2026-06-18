// AS Multiverse — PW API Proxy
// Token priority: 1) User token (from login) 2) Auto-scraped from original site

let cachedToken = null;
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

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

async function scrapeTokenFromOriginal() {
  try {
    const res = await fetch("https://stream.testuk.org/content?batchId=test&subjectId=test&batchName=t&subjectName=t", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"authorization"\s*:\s*"(Bearer\s+[A-Za-z0-9\-_\.]+)"/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (e) {
    console.error("Token scrape failed:", e.message);
    return null;
  }
}

async function getToken(userToken) {
  // Priority 1: User-provided token from PW login
  if (userToken) return userToken;

  // Priority 2: Cached scraped token
  if (cachedToken && (Date.now() - cacheTime) < CACHE_DURATION) {
    return cachedToken;
  }

  // Priority 3: Fresh scrape from original site
  const scraped = await scrapeTokenFromOriginal();
  if (scraped) {
    cachedToken = scraped;
    cacheTime = Date.now();
    return scraped;
  }

  // Priority 4: Return cached even if stale
  if (cachedToken) return cachedToken;

  return null;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-PW-Token");
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

  // Get token — user token from header, or auto-scraped
  const userToken = req.headers["x-pw-token"] || null;
  const token = await getToken(userToken ? `Bearer ${userToken}` : null);

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
    const data = await apiRes.json();

    // Extract CloudFront signed cookies and convert to query parameters to bypass DRM/CORS
    let cookiesStr = apiRes.headers.get('set-cookie') || '';
    let policy = cookiesStr.match(/CloudFront-Policy=([^;,\s]+)/)?.[1];
    let signature = cookiesStr.match(/CloudFront-Signature=([^;,\s]+)/)?.[1];
    let keyPairId = cookiesStr.match(/CloudFront-Key-Pair-Id=([^;,\s]+)/)?.[1];

    if (policy && signature && keyPairId && data?.data?.videoDetails?.videoUrl) {
        const sep = data.data.videoDetails.videoUrl.includes('?') ? '&' : '?';
        data.data.videoDetails.videoUrl += `${sep}Policy=${policy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
    }

    // If 401, clear cache and signal need for login
    if (apiRes.status === 401 || (data && data.status === 401)) {
      cachedToken = null;
      cacheTime = 0;
      return res.status(401).json({
        error: "Token expired",
        needsLogin: true,
        message: "Token expired. Please login again."
      });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (e) {
    console.error("Proxy error:", e.message);
    return res.status(500).json({ error: "Proxy request failed", message: e.message });
  }
}
