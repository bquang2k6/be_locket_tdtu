import dbConnect from "../lib/mongodb.js";
import Link from "../models/Link.js";

export default async function handler(req, res) {
  await dbConnect();

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
