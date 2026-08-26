import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket/index.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getAssigneeList = (task) => {
  if (Array.isArray(task.assignedToMultiple) && task.assignedToMultiple.length) {
    return task.assignedToMultiple;
  }
  return task.assignedTo ? [task.assignedTo] : [];
};

const notifyAssignees = async (assignees, title, message) => {
  const io = getIO();
  for (const empId of assignees) {
    const notif = await Notification.create({
      recipientId: String(empId),
      title,
      message,
      type: 'task',
      createdAt: new Date().toISOString()
    });
    if (io) {
      io.to(String(empId)).emit('new-notification', notif);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SALES TASKS  (/api/tasks/*)
// ═══════════════════════════════════════════════════════════════════════════

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
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json(updated);
});

// GET /api/tasks/user/:empId
export const getUserTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.params.empId });
  res.json(tasks);
});

// GET /api/tasks/project/:projectId
// (used by the frontend's polling loop to display tasks under each project card)
export const getProjectTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ projectId: req.params.projectId });
  res.json(tasks);
});

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT TASKS  (/api/project-tasks/*)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/project-tasks
export const addProjectTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    status: req.body.status || 'Todo', // was 'Pending' — frontend badge map didn't recognize it
    createdAt: new Date().toISOString(),
    type: 'PROJECT_TASK'
  });

  const assignees = getAssigneeList(task);
  if (assignees.length) {
    await notifyAssignees(
      assignees,
      'New Task Assigned',
      `You have been assigned to task: ${task.title} in project ${task.projectTitle || ''}`
    );
  }

  res.status(201).json(task);
});

// PUT /api/project-tasks/:taskId
// Handles BOTH a quick status-only update (from the status dropdown) and a
// full edit (title/description/dueDate/assignees) from the Edit Task modal.
export const updateProjectTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const existing = await Task.findById(taskId);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const updated = await Task.findByIdAndUpdate(taskId, { $set: req.body }, { new: true });

  // If assignees were changed as part of this update, notify the (new) assignee list.
  if (req.body.assignedToMultiple || req.body.assignedTo) {
    const assignees = getAssigneeList(updated);
    if (assignees.length) {
      await notifyAssignees(
        assignees,
        'Task Updated',
        `Task "${updated.title}" in project ${updated.projectTitle || ''} was updated.`
      );
    }
  }

  res.json(updated);
});

// Back-compat alias — older code/routes may still import this name.
export const updateTaskProgress = updateProjectTask;

// DELETE /api/project-tasks/:taskId
export const deleteProjectTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const deleted = await Task.findByIdAndDelete(taskId);
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted successfully' });
});