// lib/cors.js
import Cors from "cors";

// Khởi tạo CORS middleware
const cors = Cors({
  origin: ["https://fe-locket-tdtu.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
});

// Helper để chạy middleware trong Next.js API (hoặc Vercel API routes)
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default function applyCors(req, res) {
  return runMiddleware(req, res, cors);
}
