// AS Multiverse — PW Authentication API
// Handles sendOTP and verifyOTP for PW login

const PW_BASE = "https://api.penpencil.co";
const ORG_ID = "5eb393ee95fab7468a79d189"; // PhysicsWallah org

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 11; SM-A707F Build/RP1A.200720.012)",
  "client-id": "ADMIN",
  "client-type": "MOBILE",
  "client-version": "538",
  "randomid": "3d3b49f068728fa3",
  "referer": "https://android.pw.live"
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, phone, otp, otpType } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: "Missing 'action' field" });
  }

  try {
    if (action === "sendOtp") {
      if (!phone) return res.status(400).json({ error: "Missing phone number" });

      const response = await fetch(`${PW_BASE}/v2/sendOtp`, {
        method: "POST",
        headers: BASE_HEADERS,
        body: JSON.stringify({
          username: phone,
          countryCode: "+91",
          organizationId: ORG_ID
        })
      });
      const data = await response.json();

      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(response.ok ? 200 : 400).json(data);

    } else if (action === "verifyOtp") {
      if (!phone || !otp) {
        return res.status(400).json({ error: "Missing phone or otp" });
      }

      const response = await fetch(`${PW_BASE}/v2/verifyOtp`, {
        method: "POST",
        headers: BASE_HEADERS,
        body: JSON.stringify({
          username: phone,
          otp: otp,
          client_type: "WEB",
          organizationId: ORG_ID,
          otpType: otpType || "sms"
        })
      });
      const data = await response.json();

      if (data.success && data.data && data.data.token) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).json({
          success: true,
          token: data.data.token,
          user: {
            name: `${data.data.firstName || ""} ${data.data.lastName || ""}`.trim(),
            username: data.data.username || phone
          }
        });
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(400).json(data);

    } else {
      return res.status(400).json({ error: "Invalid action. Use 'sendOtp' or 'verifyOtp'" });
    }
  } catch (e) {
    console.error("Auth error:", e.message);
    return res.status(500).json({ error: "Authentication request failed", message: e.message });
  }
}
