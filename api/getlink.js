// src/pages/api/getlink.js
import Cors from "cors";

const cors = Cors({
  origin: [
    "https://fe-locket-tdtu.vercel.app",
    "http://localhost:5173",
    "https://locket-tdtu.wangtech.top",
  ],
  methods: ["POST", "OPTIONS"],
  credentials: true,
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { link } = req.body;
  if (!link || typeof link !== "string") {
    return res.status(400).json({ error: "Link required" });
  }

  try {
    // 1️⃣ --- Lấy idToken (Authorization) ---
    const authResp = await fetch("https://apilocketwan.traidep.site/locket/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "42phambaquangl9h@gmail.com",
        password: "phambaquang",
      }),
    });

    if (!authResp.ok) {
      const errText = await authResp.text();
      return res.status(500).json({ error: "Không lấy được token", detail: errText });
    }

    const authData = await authResp.json();
    const idToken = authData?.idToken;
    if (!idToken) {
      return res.status(500).json({ error: "Thiếu idToken trong phản hồi đăng nhập" });
    }

    // 2️⃣ --- Lấy link động (resolveDynamicLink) ---
    const linkIdMatch = link.match(/\/links\/([^/?]+)/);
    if (!linkIdMatch) {
      return res.status(400).json({ error: "Link không hợp lệ, không tìm thấy id" });
    }
    const shortId = linkIdMatch[1];

    const resolveResp = await fetch("https://api.locketcamera.com/resolveDynamicLink", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
      body: JSON.stringify({
        data: {
          link: `https://locket.camera/links/${shortId}`,
        },
      }),
    });

    if (!resolveResp.ok) {
      const errText = await resolveResp.text();
      return res.status(500).json({ error: "Không resolve được link", detail: errText });
    }

    const resolveData = await resolveResp.json();
    const inviteLink = resolveData?.result?.data?.link;
    if (!inviteLink) {
      return res.status(500).json({ error: "Không tìm thấy link invite trong phản hồi" });
    }

    // 3️⃣ --- Trích invite_token từ link trả về ---
    const inviteMatch = inviteLink.match(/\/invites\/([^?]+)/);
    if (!inviteMatch) {
      return res.status(500).json({ error: "Không tìm thấy invite_token trong link" });
    }
    const inviteToken = inviteMatch[1];

    // 4️⃣ --- Gọi fetchUserForInviteToken ---
    const userResp = await fetch("https://api.locketcamera.com/fetchUserForInviteToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
      body: JSON.stringify({
        data: {
          invite_token: inviteToken,
        },
      }),
    });

    if (!userResp.ok) {
      const errText = await userResp.text();
      return res.status(500).json({ error: "Không fetch được thông tin người dùng", detail: errText });
    }

    const userData = await userResp.json();
    const user = userData?.result?.data?.user;
    if (!user) {
      return res.status(500).json({ error: "Không có dữ liệu user trong phản hồi" });
    }

    // ✅ Trả về kết quả cuối cùng
    return res.json({
      status: 200,
      invite_token: inviteToken,
      user,
    });

  } catch (err) {
    console.error("API /getlink error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
