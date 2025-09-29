import dbConnect from "../lib/mongodb.js";
import Link from "../models/Link.js";
import Cors from "cors";

const cors = Cors({
  origin: ["https://fe-locket-tdtu.vercel.app", "http://localhost:5173"],
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

export default async function handler(req, res) {
  await dbConnect();
  // chạy cors trước
  await runMiddleware(req, res, cors);

  if (req.method === "GET") {
    try {
      const docs = await Link.find({}, { link: 1, name: 1, avatar: 1 }).sort({ createdAt: -1 });
      return res.json(docs.map(d => ({
        id: d._id,
        link: d.link,
        name: d.name,
        avatar: d.avatar
      })));
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
