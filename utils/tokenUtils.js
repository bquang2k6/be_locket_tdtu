// src/pages/api/getlink.js
import fetch from "node-fetch";
import Cors from "cors";
import dbConnect from "../../lib/mongodb.js";
import Token from "../../models/Token.js";
import { isIdTokenExpired } from "../../utils/tokenUtils.js";

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

// ✅ Hàm lấy token (ưu tiên lấy từ MongoDB)
async function getAuthToken() {
  await dbConnect();

  // 1️⃣ Tìm token trong DB
  let tokenDoc = await Token.findOne({ name: "locket" });

  if (tokenDoc && tokenDoc.value && !isIdTokenExpired(tokenDoc.value)) {
    console.log("✅ Token trong MongoDB còn hạn, dùng lại.");
    return tokenDoc.value;
  }

  console.log("🔄 Token hết hạn hoặc chưa có, đăng nhập lại...");

  // 2️⃣ Gọi API login để lấy token mới
  const loginRes = await fetch("https://apilocketwan.traidep.site/locket/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "42phambaquangl9h@gmail.com",
      password: "phambaquang",
    }),
  });

  const loginText = await loginRes.text();
  let loginData;
  try {
    loginData = JSON.parse(loginText);
  } catch {
    console.error("❌ API login không trả JSON hợp lệ:", loginText);
    throw new Error("API login không hợp lệ");
  }

  if (!loginData.idToken) {
    throw new Error("Không lấy được idToken từ login API");
  }

  const newToken = loginData.idToken;

  // 3️⃣ Lưu hoặc cập nhật token vào MongoDB
  if (tokenDoc) {
    tokenDoc.value = newToken;
    tokenDoc.updatedAt = Date.now();
    await tokenDoc.save();
    console.log("💾 Đã cập nhật token mới vào MongoDB");
  } else {
    await Token.create({ name: "locket", value: newToken });
    console.log("💾 Đã tạo token mới trong MongoDB");
  }

  return newToken;
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
    } catch {
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
