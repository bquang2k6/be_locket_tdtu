// app/api/links/route.js
import { NextResponse } from "next/server";
import cheerio from "cheerio";
import Link from "@/models/Link";
import connectDB from "@/lib/mongoose";
import { verifyAuth } from "@/middleware/auth";

const PASSWORD_RE = /^[A-Za-z0-9](?:25|24|23|22|21)[A-Za-z0-9]\d{4}$/;

export async function POST(req) {
  try {
    // ✅ connect DB
    await connectDB();

    // ✅ check token
    const user = verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password, link, name } = await req.json();

    if (!password || !link || !name) {
      return NextResponse.json(
        { error: "password, link và name là bắt buộc" },
        { status: 400 }
      );
    }

    if (!PASSWORD_RE.test(password)) {
      return NextResponse.json(
        { error: "Sai định dạng mssv hoặc sai mssv" },
        { status: 400 }
      );
    }

    // 🔹 Normalize link
    let normalizedLink = String(link).trim();
    if (!/^https?:\/\//i.test(normalizedLink)) {
      normalizedLink = "https://locket.cam/" + normalizedLink.replace(/^\/+/, "");
    } else {
      try {
        const u = new URL(normalizedLink);
        if (u.hostname !== "locket.cam") {
          return NextResponse.json(
            { error: "Link must be on locket.cam" },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { error: "Sai định dạng link locket" },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "Vui lòng kiểm tra lại id hoặc link" },
          { status: 400 }
        );
      }

      const text = await resp.text();
      if (!/Add me on Locket/i.test(text)) {
        return NextResponse.json(
          { error: "Vui lòng kiểm tra lại id hoặc link" },
          { status: 400 }
        );
      }

      const $ = cheerio.load(text);
      const img = $(".profile-pic-img").attr("src");
      if (img) {
        avatarUrl = img.startsWith("http") ? img : `https://locket.cam${img}`;
      }
    } catch (err) {
      console.error("Fetch error:", err?.message || err);
      return NextResponse.json(
        { error: "Vui lòng kiểm tra lại id hoặc link" },
        { status: 400 }
      );
    }

    // 🔹 Check duplicate link
    const existing = await Link.findOne({ link: normalizedLink });
    if (existing) {
      return NextResponse.json(
        { error: "Link này đã tồn tại, không thể thêm lại" },
        { status: 400 }
      );
    }

    const doc = new Link({ link: normalizedLink, password, name, avatar: avatarUrl });
    await doc.save();

    return NextResponse.json(
      { id: doc._id, link: doc.link, name: doc.name, avatar: doc.avatar },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
