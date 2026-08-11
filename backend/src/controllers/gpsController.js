import GpsRoute from '../models/GpsRoute.js';
import DailyStat from '../models/DailyStat.js';
import { calculateDistance } from '../utils/helpers.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/gps/route
export const addRoutePoint = asyncHandler(async (req, res) => {
  const { userId, latitude, longitude, timestamp } = req.body;
  const dateStr = timestamp.split('T')[0];

  const lastPoint = await GpsRoute.findOne({ userId }).sort({ timestamp: -1 });

  let dist = 0;
  if (lastPoint && lastPoint.timestamp && lastPoint.timestamp.split('T')[0] === dateStr) {
    dist = calculateDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
  }

  await GpsRoute.create(req.body);

  const statsId = `${userId}_${dateStr}`;
  const existing = await DailyStat.findById(statsId);

  if (!existing) {
    await DailyStat.create({
      _id: statsId,
      userId,
      date: dateStr,
      totalDistance: dist,
      lastUpdated: timestamp
    });
  } else {
    existing.totalDistance = (existing.totalDistance || 0) + dist;
    existing.lastUpdated = timestamp;
    await existing.save();
  }

  res.json({ status: 'ok', addedDistance: dist });
});

// GET /api/gps/route/:userId
export const getDailyRoute = asyncHandler(async (req, res) => {
  const route = await GpsRoute.find({ userId: req.params.userId }).sort({ timestamp: 1 });
  res.json(route);
});

// GET /api/gps/stats/:userId?date=
export const getDailyStats = asyncHandler(async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const statsId = `${req.params.userId}_${dateStr}`;
  const stats = await DailyStat.findById(statsId);
  res.json(stats || { userId: req.params.userId, date: dateStr, totalDistance: 0 });
});