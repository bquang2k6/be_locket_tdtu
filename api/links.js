import dbConnect from "../lib/mongodb.js";
import applyCors from "../lib/cors.js";
import Link from "../models/Link.js";
import jwt from "jsonwebtoken";
import { load } from "cheerio";

const PASSWORD_RE = /^[A-Za-z0-9](?:25|24|23|22|21)[A-Za-z0-9]\d{4}$/;

export default async function handler(req, res) {
  await dbConnect();
  // Always run CORS first
  await applyCors(req, res);

  if (req.method === "POST") {
    // Check JWT
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    try {
      jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "change-this-secret");
    } catch {
      return res.status(403).json({ error: "Invalid token" });
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
    }

    let avatarUrl = null;
    try {
      // Helpful debug log (avoid logging sensitive fields like password)
      console.debug("api/links: fetching normalized link", { link: normalizedLink, name });

      const resp = await fetch(normalizedLink);
      if (!resp.ok) {
        // Provide a short detail to help debugging in development — safe info only
        return res.status(400).json({
          error: "Vui lòng kiểm tra lại id hoặc link",
          detail: `fetch failed with status ${resp.status} ${resp.statusText}`,
        });
      }


  const text = await resp.text();

  // Check for expected Locket marker or profile image
  const hasMarker = /Add me on Locket/i.test(text);
  const $ = load(text);
  const img = $(".profile-pic-img").attr("src");

      if (!hasMarker && !img) {
        return res.status(400).json({
          error: "Vui lòng kiểm tra lại id hoặc link",
          detail: "page did not contain expected Locket marker or profile image",
        });
      }

      if (img) {
        avatarUrl = img.startsWith("http") ? img : `https://locket.cam${img}`;
      }
    } catch (err) {
      // Include the error message for debugging (do not expose stack trace)
      console.error("api/links: fetch error", err && err.message ? err.message : err);
      return res.status(400).json({
        error: "Vui lòng kiểm tra lại id hoặc link",
        detail: err && err.message ? err.message : String(err),
      });
    }

    const existing = await Link.findOne({ link: normalizedLink });
    if (existing) {
      return res.status(400).json({ error: "Link này đã tồn tại, không thể thêm lại" });
    }

    const doc = new Link({ link: normalizedLink, password, name, avatar: avatarUrl });
    await doc.save();
    return res.status(201).json({ id: doc._id, link: doc.link, name: doc.name, avatar: doc.avatar });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
