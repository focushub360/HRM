import mongoose from 'mongoose';

// _id is the composite key `${userId}_${date}` exactly like the old
// Firestore document id, so lookups stay O(1) on the primary key.
const dailyStatSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: String,
    date: String,
    totalDistance: { type: Number, default: 0 },
    lastUpdated: String
  },
  { strict: false }
);

dailyStatSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('DailyStat', dailyStatSchema);