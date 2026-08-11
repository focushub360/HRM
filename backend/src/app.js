import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// ---------- Core middleware ----------
const corsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(cors({ origin: corsOrigin }));
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