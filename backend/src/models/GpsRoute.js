import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const gpsRouteSchema = new mongoose.Schema(
  {
    userId: String,
    latitude: Number,
    longitude: Number,
    timestamp: String
  },
  { strict: false }
);

gpsRouteSchema.set('toJSON', idTransform);

export default mongoose.model('GpsRoute', gpsRouteSchema);