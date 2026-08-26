import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

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

// ---------- Security & Rate Limiting ----------
// FIX: Helmet's default Content-Security-Policy sets `script-src 'self'`
// with NO 'unsafe-eval'. Vite's dev server (Fast Refresh / HMR client)
// relies on eval()/new Function() to wire up module boundaries correctly
// — when CSP blocks that, HMR can silently corrupt a component's stored
// effect-cleanup reference, producing "TypeError: destroy is not a
// function" seemingly at random. This only matters if this Express app
// ever serves (or proxies/shares headers with) the page the browser
// navigates to; if the frontend is always served purely by Vite on a
// separate origin, Helmet's headers on API responses don't affect page
// script execution at all — but there's no downside to relaxing this
// only in dev, so we do it unconditionally for safety.
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? undefined // use Helmet's secure defaults in production
        : {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
            },
          },
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// ---------- Parsing Middlewares ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ---------- Request Logging ----------
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ---------- API routes ----------
// All routes are mounted under /api to match the existing frontend config.js (VITE_API_URL/api)
app.use('/api', routes);

// ---------- 404 + error handler ----------
app.use(notFound);
app.use(errorHandler);

export default app;