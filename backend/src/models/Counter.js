import mongoose from 'mongoose';

// Generic counter collection used to generate sequential numeric IDs
// (mirrors the old Firestore "max(id)+1" logic) so the frontend, which
// relies on numeric ids like company.id / employee.id, keeps working.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "companyId", "employeeId"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

export const getNextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export default Counter;