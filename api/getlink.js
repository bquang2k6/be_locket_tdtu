import fetch from "node-fetch";
import Cors from "cors";

const cors = Cors({
  origin: [
    "https://fe-locket-tdtu.vercel.app",
    "http://localhost:5173",
    "https://locket-tdtu.wangtech.top",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) reject(result);
      else resolve(result);
    });
  });
}

let authToken = null;
let tokenTimestamp = 0;

async function getAuthToken() {
  const now = Date.now();
  if (authToken && now - tokenTimestamp < 3600 * 1000) {
    return authToken;
  }

  const loginRes = await fetch("https://apilocketwan.traidep.site/locket/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.LOCKET_EMAIL,
      password: process.env.LOCKET_PASSWORD,
    }),
  });

  const loginData = await loginRes.json();
  authToken = loginData.idToken;
  tokenTimestamp = now;

  return authToken;
}

async function getInviteToken(link) {
  const res = await fetch(link, { redirect: "follow" });
  const finalUrl = res.url;
  const match = finalUrl.match(/\/invites\/([^?]+)/);
  if (!match) throw new Error("Không tìm thấy invite_token trong URL.");
  return match[1];
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["GET", "POST"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Thiếu link." });

    const inviteToken = await getInviteToken(link);
    const auth = await getAuthToken();

    const userRes = await fetch("https://api.locketcamera.com/fetchUserForInviteToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth}`,
      },
      body: JSON.stringify({ data: { invite_token: inviteToken } }),
    });

    const userData = await userRes.json();
    return res.status(200).json({
      success: true,
      inviteToken,
      result: userData.result?.data?.user || userData,
    });
  } catch (error) {
    console.error("API /getlink error:", error);
    return res.status(500).json({ error: error.message });
  }
}
