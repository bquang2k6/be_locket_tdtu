// src/pages/api/keep_live.js
import jwt from "jsonwebtoken";
import Cors from "cors";

const cors = Cors({
  origin: ["https://fe-locket-tdtu.vercel.app", "http://localhost:5173", "https://locket-tdtu.wangtech.top"],
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"], // thêm dòng này tránh lỗi 403 không có Authorization
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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change-this-secret");
    return res.json({ valid: true, exp: decoded.exp }); // token hợp lệ
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
