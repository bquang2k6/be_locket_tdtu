const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  name: { type: String, required: true }, // thêm trường name
  link: { type: String, required: true },
  password: { type: String, required: true },
  avatar: {
    type: String,
    required: false,
  } //  Thêm avatar
}, { timestamps: true });

module.exports = mongoose.model('Link', linkSchema);
