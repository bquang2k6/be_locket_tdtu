require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cheerio = require('cheerio');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const Link = require('./models/Link');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
// Middleware để log request (trừ GET /link-locket)
app.use((req, res, next) => {
  if (!(req.method === 'GET' && req.path === '/link-locket')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (Object.keys(req.body || {}).length > 0) {
      console.log(req.body);
    }
  }
  next();
});

// Middleware xử lý lỗi (phải đặt sau tất cả route)
app.use((req, res, next) => {
  res.error = (statusCode, message) => {
    console.error(`[${new Date().toISOString()}] ❌ ${message}`);
    return res.status(statusCode).json({ error: message });
  };
  next();
});

// Bắt lỗi không xử lý trong Promise
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] ❌ Unhandled Rejection:`, reason);
});

// Bắt lỗi exception chưa được catch
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] ❌ Uncaught Exception:`, err);
  process.exit(1); // tuỳ bạn có muốn tắt server hay không
});



const PORT = process.env.PORT || 3000;

// Password regex used in multiple routes
const PASSWORD_RE = /^[A-Za-z0-9](?:25|24|23|22|21)[A-Za-z0-9]\d{4}$/;

const MONGODB_URI = process.env.MONGODB_URI ;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Mongo connection error:', err));

// Login route: accepts a password matching the required pattern and returns a JWT
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') return res.error(400, 'Password required' );

  // Password pattern:
  // 1st char: letter (a-zA-Z)
  // next 2 chars: one of 25,24,23,22,21
  // 4th char: letter (a-zA-Z)
  // last 4 chars: digits
  if (!PASSWORD_RE.test(password)) return res.error(400, 'Sai định dạng mssv hoặc sai mssv' );

  const token = jwt.sign({ authorized: true }, process.env.JWT_SECRET || 'change-this-secret', { expiresIn: '1h' });
  res.json({ token });
});

// Add link: protected route. Save link text/url with associated password
// Add link: protected route. Save link text/url with associated password
app.post('/links', auth, async (req, res) => {
  const { password, link, name } = req.body;
  if (!password || !link || !name) return res.error(400, 'password, link và name là bắt buộc' );

  // validate password
  if (!PASSWORD_RE.test(password)) return res.error(400, 'Sai định dạng mssv hoặc sai mssv' );

  // Normalize the link: if the user provided a short id (no protocol), prepend host
  let normalizedLink = String(link).trim();
  if (!/^https?:\/\//i.test(normalizedLink)) {
    normalizedLink = 'https://locket.cam/' + normalizedLink.replace(/^\/+/, '');
  } else {
    try {
      const u = new URL(normalizedLink);
      if (u.hostname !== 'locket.cam') return res.error(400, 'Link must be on locket.cam' );
    } catch (e) {
      return res.error(400, 'Sai định dạng link locket' );
    }
  }
  let avatarUrl = null;

  // Fetch the page and check it contains the required phrase
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(normalizedLink, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return res.error(400, 'Vui lòng kiểm tra lại id hoặc link' );
    const text = await resp.text();
    const found = /Add me on Locket/i.test(text);
    if (!found) return res.error(400, 'Vui lòng kiểm tra lại id hoặc link' );
    // lấy ảnh avatar
    const $ = cheerio.load(text);
    const img = $('.profile-pic-img').attr('src');
    if (img) {
      avatarUrl = img.startsWith('http') ? img : `https://locket.cam${img}`;
    }
  } catch (err) {
    console.error('Fetch error:', err && err.message ? err.message : err);
    return res.error(400, 'Vui lòng kiểm tra lại id hoặc link' );
  }

  try {
    // 🔹 Kiểm tra link đã tồn tại chưa
    const existing = await Link.findOne({ link: normalizedLink });
    if (existing) {
      return res.error(400, 'Link này đã tồn tại, không thể thêm lại' );
    }

    const doc = new Link({ link: normalizedLink, password, name, avatar: avatarUrl  });
    await doc.save();
    res.status(201).json({ id: doc._id, link: doc.link, name: doc.name, avatar: doc.avatar  });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List links: public route, returns links only (no passwords)
app.get('/link-locket', async (req, res) => {
  try {
    const docs = await Link.find({}, { link: 1, name: 1, avatar:1 }).sort({ createdAt: -1 });
    res.json(docs.map(d => ({ id: d._id, link: d.link, name: d.name, avatar: d.avatar  })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
