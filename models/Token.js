// models/Token.js
import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // ví dụ: "locket"
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Token || mongoose.model("Token", TokenSchema);
