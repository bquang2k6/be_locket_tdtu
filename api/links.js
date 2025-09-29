import dbConnect from "../lib/mongodb.js";
import Link from "../models/Link.mjs";
import * as cheerio from "cheerio";
import { verifyAuth } from "../middleware/auth.mjs";

const PASSWORD_RE = /^[A-Za-z](?:25|24|23|22|21)[A-Za-z]\d{4}$/;

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await new Promise((resolve, reject) => {
      verifyAuth(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  } catch (err) {
    if (!res.headersSent) res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { password, link, name } = req.body;
  if (!password || !link || !name) {
    return res.status(400).json({ error: "password, link và name là bắt buộc" });
  }

  if (!PASSWORD_RE.test(password)) {
    return res.status(400).json({ error: "Sai định dạng mssv hoặc sai mssv" });
  }

  let normalizedLink = String(link).trim();
  if (!/^https?:\/\//i.test(normalizedLink)) {
    normalizedLink = "https://locket.cam/" + normalizedLink.replace(/^\/+/, "");
  } else {
    try {
      const u = new URL(normalizedLink);
      if (u.hostname !== "locket.cam") {
        return res.status(400).json({ error: "Link must be on locket.cam" });
      }
    } catch (e) {
      return res.status(400).json({ error: "Sai định dạng link locket" });
    }
  }

  let avatarUrl = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(normalizedLink, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return res.status(400).json({ error: "Vui lòng kiểm tra lại id hoặc link" });

    const text = await resp.text();
    if (!/Add me on Locket/i.test(text)) return res.status(400).json({ error: "Vui lòng kiểm tra lại id hoặc link" });

    const $ = cheerio.load(text);
    const img = $(".profile-pic-img").attr("src");
    if (img) avatarUrl = img.startsWith("http") ? img : `https://locket.cam${img}`;
  } catch (err) {
    console.error("Fetch error:", err?.message || err);
    return res.status(400).json({ error: "Vui lòng kiểm tra lại id hoặc link" });
  }

  try {
    const existing = await Link.findOne({ link: normalizedLink });
    if (existing) return res.status(400).json({ error: "Link này đã tồn tại, không thể thêm lại" });

    const doc = new Link({ link: normalizedLink, password, name, avatar: avatarUrl });
    await doc.save();

    return res.status(201).json({ id: doc._id, link: doc.link, name: doc.name, avatar: doc.avatar });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
