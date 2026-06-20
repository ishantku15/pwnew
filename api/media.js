// AS Multiverse — Media Proxy
// Fetches video content details from PW API and returns the playable video URL
// This handles the CloudFront signed cookies that can't be captured client-side

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

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-PW-Token");
    return res.status(200).end();
  }

  const { batchId, subjectId, scheduleId } = req.query;

  if (!batchId || !subjectId || !scheduleId) {
    return res.status(400).json({ error: "Missing batchId, subjectId, or scheduleId" });
  }

  const userToken = req.headers["x-pw-token"] || null;
  const token = userToken ? `Bearer ${userToken}` : (process.env.PW_TOKEN || FALLBACK_TOKEN);

  const headers = { ...PW_HEADERS, authorization: token };

  try {
    // Try v2 contents endpoint
    let apiRes = await fetch(
      `https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents/${scheduleId}`,
      { headers }
    );
    let data = await apiRes.json();

    if (!data || !data.success) {
      // Fallback to v1 schedule
      apiRes = await fetch(
        `https://api.penpencil.co/v1/batches/${batchId}/subject/${subjectId}/schedule/${scheduleId}`,
        { headers }
      );
      data = await apiRes.json();
    }

    if (!data || !data.success || !data.data) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(404).json({ error: "Content not found", raw: data });
    }

    const item = data.data;
    const vd = item.videoDetails || {};

    // Extract CloudFront signed cookies from the response
    let cookiesStr = apiRes.headers.get('set-cookie') || '';
    let policy = cookiesStr.match(/CloudFront-Policy=([^;,\s]+)/)?.[1];
    let signature = cookiesStr.match(/CloudFront-Signature=([^;,\s]+)/)?.[1];
    let keyPairId = cookiesStr.match(/CloudFront-Key-Pair-Id=([^;,\s]+)/)?.[1];

    let videoUrl = vd.videoUrl || '';

    // Construct URL from key if no videoUrl
    if (!videoUrl && vd.key) {
      videoUrl = `https://d1d34p8vz63oiq.cloudfront.net/${vd.key}/master.m3u8`;
    }

    // Append CloudFront signed params if available
    if (videoUrl && policy && signature && keyPairId) {
      const sep = videoUrl.includes('?') ? '&' : '?';
      videoUrl += `${sep}Policy=${policy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      success: true,
      videoUrl: videoUrl,
      embedUrl: vd.embedUrl || null,
      title: item.topic || vd.name || '',
      date: item.date || item.startTime || '',
      duration: vd.duration || '',
      key: vd.key || null,
      // Include notes data too for notes tab
      homeworkIds: item.homeworkIds || []
    });
  } catch (e) {
    console.error("Media proxy error:", e.message);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: "Failed to fetch video details", message: e.message });
  }
}
