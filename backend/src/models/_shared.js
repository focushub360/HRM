// Shared toJSON transform: exposes Mongo's ObjectId as a plain string `id`
// field (mirroring Firestore document ids), so frontend code that reads
// `item.id` keeps working without changes.
export const idTransform = {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
};