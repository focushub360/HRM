import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { registerSocketHandlers } from './src/socket/index.js';
import { startWeeklyCleanupScheduler } from './src/utils/scheduler.js';
import { initAttendanceCron } from './src/cron/attendanceCron.js';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const start = async () => {
  await connectDB();

  const httpServer = createServer(app);
  const KNOWN_ORIGINS = [
    'https://hrms.focusengineeringapp.com',
    'https://www.hrms.focusengineeringapp.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  const envOrigins = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];
  const socketOrigins = [...new Set([...KNOWN_ORIGINS, ...envOrigins])];

  const io = new Server(httpServer, {
    cors: {
      origin: socketOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  // Make io available to controllers via req.app.get('io')
  app.set('io', io);
  registerSocketHandlers(io);
  startWeeklyCleanupScheduler();
  initAttendanceCron();

  httpServer.listen(PORT, HOST, () => {
    console.log(`✅ HRMS Backend Server running on http://${HOST}:${PORT}`);
    console.log(`🍃 Database: CONNECTED TO MONGODB`);
    console.log(`📡 Socket.io: READY`);
  });
};

start();