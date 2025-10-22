import fetch from "node-fetch";
import Cors from "cors";
import { jwtDecode } from "jwt-decode";

// ⚙️ Cấu hình CORS
const cors = Cors({
  origin: [
    "https://fe-locket-tdtu.vercel.app",
    "http://localhost:5173",
    "https://locket-tdtu.wangtech.top",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
});

// ⚙️ Middleware cho CORS
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) reject(result);
      else resolve(result);
    });
  });
}

// ⚙️ Bộ nhớ cache tạm (RAM)
let authToken = null;
let tokenTimestamp = 0;

// ✅ Kiểm tra token còn hạn không
function isTokenExpired(token, bufferSeconds = 300) {
  try {
    const { exp } = jwtDecode(token);
    const now = Date.now() / 1000;
    const timeLeft = exp - now;
    console.log(`⏳ Token còn hạn khoảng ${Math.floor(timeLeft)} giây`);
    return exp < now + bufferSeconds; // hết hạn nếu còn < 5 phút
  } catch (err) {
    console.error("❌ Token không hợp lệ:", err);
    return true;
  }
}

// ✅ Hàm lấy token (và cache)
async function getAuthToken() {
  const now = Date.now();
  if (authToken && !isTokenExpired(authToken)) {
    console.log("✅ Token còn hạn, dùng lại token cũ.");
    return authToken;
  }

  console.log("🔄 Token hết hạn hoặc chưa có, đang đăng nhập lại...");
  const loginRes = await fetch("https://apilocketwan.traidep.site/locket/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "42phambaquangl9h@gmail.com",
      password: "phambaquang",
    }),
  });

  const loginText = await loginRes.text();
  try {
    const loginData = JSON.parse(loginText);
    if (!loginData.idToken) throw new Error("Không lấy được idToken từ login API");
    authToken = loginData.idToken;
    tokenTimestamp = now;
    return authToken;
  } catch (err) {
    console.error("❌ Lỗi khi parse login response:", loginText);
    throw err;
  }
}

// ✅ Lấy invite_token từ link
async function getInviteToken(link) {
  const res = await fetch(link, { redirect: "follow" });
  const finalUrl = res.url;
  const match = finalUrl.match(/\/invites\/([^?]+)/);
  if (!match) throw new Error("Không tìm thấy invite_token trong URL.");
  return match[1];
}

// ✅ API chính
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Thiếu tham số link" });

    const inviteToken = await getInviteToken(link);
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

    const text = await userRes.text();
    try {
      const userData = JSON.parse(text);
      return res.status(200).json({
        success: true,
        inviteToken,
        result: userData.result?.data?.user || userData,
      });
    } catch (err) {
      console.error("⚠️ API trả về không phải JSON:", text);
      return res.status(500).json({
        error: "API gốc không trả về JSON hợp lệ",
        rawResponse: text.slice(0, 300),
      });
    }
  } catch (error) {
    console.error("API /getlink error:", error);
    return res.status(500).json({ error: "Internal server error", detail: error.message });
  }
}
