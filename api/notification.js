// src/pages/api/notification.js
import fs from "fs";
import path from "path";
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

  try {
    const filePath = path.join(process.cwd(), "data", "notifications.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    const notifications = JSON.parse(fileData);

    return res.json({ notifications });
  } catch (err) {
    return res.status(500).json({ error: "Cannot read notifications file" });
  }
}
