const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();

// Cấu hình CORS: chỉ cho FE domain của bạn
app.use(
  cors({
    origin: ["https://fe-locket-tdtu.vercel.app", "http://localhost:5173"], 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Middleware parse JSON
app.use(express.json());

// Route test
app.get("/", (req, res) => {
  res.json({ message: "API chạy ngon rồi 🚀" });
});

// Local run
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

// Export cho Vercel (serverless)
module.exports = app;
module.exports.handler = serverless(app);
