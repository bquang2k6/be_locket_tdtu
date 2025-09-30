// src/pages/api/status.js
import dbConnect from "../lib/mongodb.js";
import Cors from "cors";

const cors = Cors({
  origin: [
    "https://fe-locket-tdtu.vercel.app",
    "http://localhost:5173",
    "https://locket-tdtu.wangtech.top",
  ],
  methods: ["GET", "OPTIONS"],
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

  let dbStatus = "disconnected";
  try {
    const conn = await dbConnect();
    if (conn?.connection?.readyState === 1) {
      dbStatus = "connected";
    }
  } catch (err) {
    dbStatus = "error";
  }

  return res.json({
    status: "ok",
    db: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime().toFixed(0) + "s",
    env: process.env.NODE_ENV || "development",
  });
}
