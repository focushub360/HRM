import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const commentSchema = new mongoose.Schema(
  {
    id: String,
    author: String,
    content: String,
    userId: String,
    avatar: String,
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { _id: false, strict: false }
);

const postSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    author: String,
    content: String,
    likes: { type: [String], default: [] },
    comments: { type: [commentSchema], default: [] },
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

postSchema.set('toJSON', idTransform);

export default mongoose.model('Post', postSchema);