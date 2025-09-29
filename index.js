const express = require("express");
const cors = require("cors");

const app = express();

// Cho phép tất cả origin (tạm thời)
app.use(cors());

// Hoặc chỉ cho frontend domain của bạn
app.use(
  cors({
    origin: ["https://fe-locket-tdtu.vercel.app"], // domain frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
// if (require.main === module) {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => console.log(`Server running on ${PORT}`));
// }
module.exports = app;                 // để chạy local bằng node
module.exports.handler = serverless(app); // để deploy trên Vercel
