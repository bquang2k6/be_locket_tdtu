import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  name: { type: String, required: true }, // thêm trường name
  link: { type: String, required: true },
  password: { type: String, required: true },
  avatar: {
    type: String,
    required: false,
  } //  Thêm avatar
}, { timestamps: true });

export default mongoose.model('Link', linkSchema);
