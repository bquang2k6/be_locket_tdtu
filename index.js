import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: [
    "https://fe-locket-tdtu.vercel.app", 
    "http://localhost:5173", 
    "https://locket-tdtu.wangtech.top"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Import API routes
import loginHandler from './api/login.js';
import linksHandler from './api/links.js';
import getlinkHandler from './api/getlink.js';
import linkLocketHandler from './api/link-locket.js';
import notificationHandler from './api/notification.js';
import statusHandler from './api/status.js';
import keepLiveHandler from './api/keep-live.js';

// API routes for localhost
app.post('/api/login', loginHandler);
app.get('/api/links', linksHandler);
app.post('/api/getlink', getlinkHandler);
app.post('/api/link-locket', linkLocketHandler);
app.get('/api/notification', notificationHandler);
app.get('/api/status', statusHandler);
app.get('/api/keep-live', keepLiveHandler);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'TDTU Locket Backend Server', 
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origins: ${corsOptions.origin.join(', ')}`);
});

export default app;
