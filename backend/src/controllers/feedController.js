import Post from '../models/Post.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/feed/:companyId
export const getCompanyFeed = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  let filter = {};
  if (companyId !== 'global') {
    const ids = [String(companyId)];
    const numId = Number(companyId);
    if (!isNaN(numId)) ids.push(numId);
    filter = { companyId: { $in: ids } };
  }

  const posts = await Post.find(filter).sort({ timestamp: -1 });
  res.json(posts);
});

// POST /api/feed
export const addPost = asyncHandler(async (req, res) => {
  const { companyId, content, author } = req.body;
  if (!companyId || !content || !author) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const post = await Post.create({
    ...req.body,
    likes: [],
    comments: [],
    timestamp: new Date().toISOString()
  });

  res.status(201).json(post);
});

// POST /api/feed/:postId/like
export const toggleLikePost = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  let likes = post.likes || [];
  if (likes.includes(userId)) {
    likes = likes.filter((id) => id !== userId);
  } else {
    likes.push(userId);
  }

  post.likes = likes;
  await post.save();

  res.json({ likes });
});

// POST /api/feed/:postId/comment
export const addComment = asyncHandler(async (req, res) => {
  const { content, author } = req.body;
  if (!content || !author) return res.status(400).json({ error: 'Missing comment content' });

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const newComment = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };

  post.comments.push(newComment);
  await post.save();

  res.json({ comments: post.comments });
});

// DELETE /api/feed/:postId
export const deletePost = asyncHandler(async (req, res) => {
  const result = await Post.deleteOne({ _id: req.params.postId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Post not found' });
  res.json({ message: 'Post deleted successfully' });
});