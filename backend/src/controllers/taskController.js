import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket/index.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/tasks  (sales task)
export const addTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    type: req.body.type || 'SALES_TASK'
  });
  res.status(201).json(task);
});

// GET /api/tasks/:companyId
export const getTasks = asyncHandler(async (req, res) => {
  const cid = Number(req.params.companyId);
  const tasks = await Task.find(isNaN(cid) ? { companyId: req.params.companyId } : { companyId: cid });
  res.json(tasks);
});

// PUT /api/tasks/:id  (sales task status)
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const updated = await Task.findByIdAndUpdate(
    req.params.id,
    { status, completionNotes: notes || '' },
    { new: true }
  );
  res.json(updated);
});

// GET /api/tasks/user/:empId
export const getUserTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.params.empId });
  res.json(tasks);
});

// GET /api/tasks/project/:projectId
export const getProjectTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ projectId: req.params.projectId });
  res.json(tasks);
});

// POST /api/project-tasks
export const addProjectTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    type: 'PROJECT_TASK'
  });

  if (task.assignedTo) {
    const notif = await Notification.create({
      recipientId: String(task.assignedTo),
      title: 'New Task Assigned',
      message: `You have been assigned to task: ${task.title} in project ${task.projectTitle || ''}`,
      type: 'task',
      createdAt: new Date().toISOString()
    });
    
    const io = getIO();
    if (io) {
      io.to(String(task.assignedTo)).emit('new-notification', notif);
    }
  }

  res.status(201).json(task);
});

// PUT /api/project-tasks/:taskId
export const updateTaskProgress = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const updated = await Task.findByIdAndUpdate(req.params.taskId, { status }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json(updated);
});