import fetch from "node-fetch";
import Cors from "cors";

// Cấu hình CORS
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

// Biến cache token (chỉ lưu trong bộ nhớ RAM)
let authToken = null;
let tokenTimestamp = 0;

// Hàm lấy Authorization (cache 1h)
async function getAuthToken() {
  const now = Date.now();
  if (authToken && now - tokenTimestamp < 3600 * 1000) {
    return authToken; // còn hiệu lực 1h
  }

  const loginRes = await fetch("https://apilocketwan.traidep.site/locket/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "42phambaquangl9h@gmail.com",
      password: "phambaquang",
    }),
  });

  const loginData = await loginRes.json();
  authToken = loginData.idToken;
  tokenTimestamp = now;

  return authToken;
}

// Hàm lấy link mới và trích xuất invite_token
async function getInviteToken(link) {
  const res = await fetch(link, { redirect: "follow" });

  // URL sau khi redirect có chứa token trong phần "res.url"
  const finalUrl = res.url;
  const match = finalUrl.match(/\/invites\/([^?]+)/);
  if (!match) throw new Error("Không tìm thấy invite_token trong URL.");
  return match[1];
}

// API chính
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const inviteToken = await getInviteToken(req.body.link);
    const auth = await getAuthToken();

    const userRes = await fetch("https://api.locketcamera.com/fetchUserForInviteToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth}`,
      },
      body: JSON.stringify({
        data: { invite_token: inviteToken },
      }),
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
