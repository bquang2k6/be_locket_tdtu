import express from "express";
import cheerio from "cheerio";
import Link from "../models/Link.js";
import connectDB from "../lib/mongodb.js";
import { verifyAuth } from "../middleware/auth.js";

const router = express.Router();

const PASSWORD_RE = /^[A-Za-z0-9](?:25|24|23|22|21)[A-Za-z0-9]\d{4}$/;

router.post("/links", verifyAuth, async (req, res) => {
  const { password, link, name } = req.body;

  if (!password || !link || !name) {
    return res.status(400).json({ error: "password, link và name là bắt buộc" });
  }

  if (!PASSWORD_RE.test(password)) {
    return res.status(400).json({ error: "Sai định dạng mssv hoặc sai mssv" });
  }

  // 🔹 Normalize link
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

  // 🔹 Crawl avatar
  let avatarUrl = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(normalizedLink, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(400).json({ error: "Vui lòng kiểm tra lại id hoặc link" });
    }

    const text = await resp.text();
    if (!/Add me on Locket/i.test(text)) {
      return res.status(400).json({ error: "Vui lòng kiểm tra lại id hoặc link" });
    }

    const $ = cheerio.load(text);
    const img = $(".profile-pic-img").attr("src");
    if (img) {
      avatarUrl = img.startsWith("http") ? img : `https://locket.cam${img}`;
    }
  } catch (err) {
    console.error("Fetch error:", err?.message || err);
    return res.status(400).json({ error: "Vui lòng kiểm tra lại id hoặc link" });
  }

  try {
    // 🔹 Check duplicate
    const existing = await Link.findOne({ link: normalizedLink });
    if (existing) {
      return res.status(400).json({ error: "Link này đã tồn tại, không thể thêm lại" });
    }

    const doc = new Link({ link: normalizedLink, password, name, avatar: avatarUrl });
    await doc.save();

    return res
      .status(201)
      .json({ id: doc._id, link: doc.link, name: doc.name, avatar: doc.avatar });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
