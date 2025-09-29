import jwt from "jsonwebtoken";
import Cors from "cors";

const cors = Cors({
  origin: ["https://fe-locket-tdtu.vercel.app", "http://localhost:5173", "https://locket-tdtu.wangtech.top" ],
  methods: ["GET", "POST", "OPTIONS"],
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

const PASSWORD_RE = /^[A-Za-z0-9](?:25|24|23|22|21)[A-Za-z0-9]\d{4}$/;

export default async function handler(req, res) {
  // chạy cors trước
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password required" });
  }

  if (!PASSWORD_RE.test(password)) {
    return res.status(400).json({ error: "Sai định dạng mssv hoặc sai mssv" });
  }

  const token = jwt.sign(
    { authorized: true },
    process.env.JWT_SECRET || "change-this-secret",
    { expiresIn: "1h" }
  );

  return res.json({ token });
}
