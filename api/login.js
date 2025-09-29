import jwt from "jsonwebtoken";

const PASSWORD_RE = /^[A-Za-z0-9](?:25|24|23|22|21)[A-Za-z0-9]\d{4}$/;

export default async function handler(req, res) {
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

  const token = jwt.sign({ authorized: true }, process.env.JWT_SECRET || "change-this-secret", { expiresIn: "1h" });
  return res.json({ token });
}
