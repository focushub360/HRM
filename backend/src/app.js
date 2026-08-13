import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// ---------- Core middleware ----------
const KNOWN_ORIGINS = [
  'https://hrms.focusengineeringapp.com',
  'https://www.hrms.focusengineeringapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const envOrigins = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

const allowedOrigins = [...new Set([...KNOWN_ORIGINS, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logger (same style as the old backend)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- API routes ----------
// All routes are mounted under /api to match the existing frontend config.js (VITE_API_URL/api)
app.use('/api', routes);

// ---------- 404 + error handler ----------
app.use(notFound);
app.use(errorHandler);

export default app;