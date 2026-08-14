import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket/index.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/projects
export const addProject = asyncHandler(async (req, res) => {
  const project = await Project.create({
    ...req.body,
    status: 'Active',
    createdAt: new Date().toISOString()
  });

  if (project.teamMembers && project.teamMembers.length > 0) {
    const io = getIO();
    for (const member of project.teamMembers) {
      if (member.id) {
        const notif = await Notification.create({
          recipientId: String(member.id),
          title: 'Added to Project',
          message: `You have been added to the project: ${project.title}`,
          type: 'project',
          createdAt: new Date().toISOString()
        });
        if (io) {
          io.to(String(member.id)).emit('new-notification', notif);
        }
      }
    }
  }

  res.status(201).json(project);
});

// GET /api/projects/:companyId
export const getProjects = asyncHandler(async (req, res) => {
  const cid = Number(req.params.companyId);
  const projects = await Project.find(
    isNaN(cid) ? { companyId: req.params.companyId } : { $or: [{ companyId: cid }, { companyId: String(req.params.companyId) }] }
  );
  res.json(projects);
});

// GET /api/projects-with-tasks/:companyId
export const getProjectsWithTasks = asyncHandler(async (req, res) => {
  const cid = Number(req.params.companyId);
  const projects = await Project.find(
    isNaN(cid) ? { companyId: req.params.companyId } : { $or: [{ companyId: cid }, { companyId: String(req.params.companyId) }] }
  );

  const combined = await Promise.all(
    projects.map(async (p) => {
      const tasks = await Task.find({ projectId: p.id });
      return { ...p.toJSON(), tasks };
    })
  );

  res.json(combined);
});

// PUT /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  const cid = req.params.id;
  const numId = Number(cid);
  const query = isNaN(numId) ? { $or: [{ id: cid }, { _id: cid }] } : { $or: [{ id: numId }, { id: cid }] };
  
  const updated = await Project.findOneAndUpdate(
    query,
    { $set: req.body },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(updated);
});