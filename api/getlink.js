import fetch from "node-fetch";
import Cors from "cors";
import mongoose from "mongoose";
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

// ⚙️ Kết nối MongoDB (dùng cache để tránh reconnect)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("❌ Thiếu biến môi trường MONGODB_URI");

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ⚙️ Model Token
const TokenSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});
const Token = mongoose.models.Token || mongoose.model("Token", TokenSchema);

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

// ✅ Lấy token từ MongoDB hoặc login mới
async function getAuthToken() {
  await dbConnect();

  let tokenDoc = await Token.findOne({ name: "locket" });
  if (tokenDoc && tokenDoc.value && !isTokenExpired(tokenDoc.value)) {
    console.log("✅ Token trong MongoDB còn hạn, dùng lại.");
    return tokenDoc.value;
  }

  console.log("🔄 Token hết hạn hoặc chưa có, đang đăng nhập lại...");
  const loginRes = await fetch("https://apilocketwan.traidep.site/locket/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.LOCKET_EMAIL,
      password: process.env.LOCKET_PASSWORD,
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

  if (!loginData.idToken) throw new Error("Không lấy được idToken từ login API");

  const newToken = loginData.idToken;

  // 💾 Lưu token mới vào MongoDB
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
