import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as db from './database.js';

import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for simplicity (Electron + React)
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// ==================== COMPANIES ====================

// Get all companies
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get company by ID
app.get('/api/companies/:id', async (req, res) => {
  try {
    const company = await db.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Create company
app.post('/api/companies', async (req, res) => {
  try {
    const { name, code, location } = req.body;
    if (!name || !code || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const company = await db.addCompany({ name, code, location });
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company
app.put('/api/companies/:id', async (req, res) => {
  try {
    const { name, code, location } = req.body;
    const updated = await db.updateCompany(req.params.id, { name, code, location });
    if (!updated) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company
app.delete('/api/companies/:id', async (req, res) => {
  try {
    await db.removeCompany(req.params.id);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// ==================== HR ACCOUNTS ====================

// Add HR to company
app.post('/api/companies/:companyId/hr', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await db.addHRToCompany(req.params.companyId, { name, email });
    if (!result) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add HR account' });
  }
});

// Remove HR from company
app.delete('/api/companies/:companyId/hr/:hrId', async (req, res) => {
  try {
    const success = await db.removeHRFromCompany(req.params.companyId, req.params.hrId);
    if (!success) {
      return res.status(404).json({ error: 'HR account not found' });
    }
    res.json({ message: 'HR account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete HR account' });
  }
});

// Update HR Status
app.put('/api/companies/:companyId/hr/:hrId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Missing status field' });
    }
    const result = await db.updateHRStatus(req.params.companyId, req.params.hrId, status);
    if (!result) {
      return res.status(404).json({ error: 'HR account not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update HR status' });
  }
});

// ==================== EMPLOYEE ACCOUNTS ====================

// Add employee to company
app.post('/api/companies/:companyId/employees', async (req, res) => {
  try {
    const { name, email, employeeType, department, position } = req.body; // Validation check
    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Pass headHr info dynamically from req.body (sent by frontend)
    const result = await db.addEmployeeToCompany(req.params.companyId, req.body);
    if (!result) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

// Get all employees of a company (Filtered by HR Ownership)
app.get('/api/companies/:companyId/employees', async (req, res) => {
  try {
    const { hrId } = req.query; // If present, filter by Head HR
    const company = await db.getCompanyById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let employees = company.employeeAccounts || [];

    // Filter if hrId is provided (Strict Ownership)
    if (hrId) {
      // hrId might be number or string, ensure type match
      // Only show employees created by this HR
      employees = employees.filter(e => String(e.headHrId) === String(hrId));
    }

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Remove employee from company
app.delete('/api/companies/:companyId/employees/:employeeId', async (req, res) => {
  try {
    const success = await db.removeEmployeeFromCompany(req.params.companyId, req.params.employeeId);
    if (!success) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Update employee
app.put('/api/companies/:companyId/employees/:employeeId', async (req, res) => {
  try {
    const success = await db.updateEmployeeInCompany(req.params.companyId, req.params.employeeId, req.body);
    if (!success) {
      return res.status(404).json({ error: 'Employee not found or update failed' });
    }
    res.json(success);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Update HR Profile
app.put('/api/companies/:companyId/hr/:hrId', async (req, res) => {
  try {
    const success = await db.updateHRInCompany(req.params.companyId, req.params.hrId, req.body);
    if (!success) {
      return res.status(404).json({ error: 'HR not found or update failed' });
    }
    res.json(success);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update HR profile' });
  }
});

// Update Company Admin Profile
app.put('/api/companies/:companyId/admin', async (req, res) => {
  try {
    const success = await db.updateCompanyAdmin(req.params.companyId, req.body);
    if (!success) {
      return res.status(404).json({ error: 'Company Admin not found or update failed' });
    }
    res.json(success);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Company Admin profile' });
  }
});

// ==================== SYSTEM SETTINGS (ADMIN) ====================

// Get All Credentials (Admin Security Dashboard)
app.get('/api/companies/:companyId/credentials', async (req, res) => {
  try {
    const credentials = await db.getCompanyCredentials(req.params.companyId);
    if (!credentials) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// Update Company Settings (Profit, Policies, etc.)
app.put('/api/companies/:id/settings', async (req, res) => {
  try {
    const updated = await db.updateCompanySettings(req.params.id, req.body);
    if (!updated) {
      // It's possible updateCompanySettings returns null if company doesn't exist
      return res.status(404).json({ error: 'Company not found' });
    }
    // updated contains { id, ...settingsData }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

// ==================== AUTHENTICATION ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { type, email, password } = req.body;
    if (!type || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await db.authenticateUser(type, email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.error === 'WRONG_ROLE') {
      // Capitalize first letter for display
      const roleDisplay = user.actualRole.charAt(0).toUpperCase() + user.actualRole.slice(1);
      return res.status(400).json({ error: `Account found as ${roleDisplay}. Please use the ${roleDisplay} Login option.` });
    }

    if (user.error === 'INACTIVE_ACCOUNT') {
      return res.status(403).json({ error: 'Your account is currently inactive. Please contact your administrator.' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    try {
      const fs = await import('fs');
      fs.default.writeFileSync('last_error.txt', String(error.stack || error));
    } catch (e) { console.error("Log failed", e); }
    res.status(500).json({ error: 'Authentication failed: ' + error.message });
  }
});

// Change Password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, type, companyId, oldPassword, newPassword } = req.body;
    if (!userId || !type || !companyId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.changePassword(type, userId, companyId, oldPassword, newPassword);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ==================== ACTIVITY LOGS ====================

// Log activity
app.post('/api/activities', async (req, res) => {
  try {
    const activityData = req.body;
    const activity = await db.logActivity(activityData);
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Delete activity
app.delete('/api/activities/:id', async (req, res) => {
  try {
    const success = await db.deleteActivity(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// Get activity logs by user
app.get('/api/activities/:empId', async (req, res) => {
  try {
    const activities = await db.getActivityLogsByUser(req.params.empId);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activity logs by company
app.get('/api/companies/:companyId/activities', async (req, res) => {
  try {
    const activities = await db.getActivityLogsByCompany(req.params.companyId);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company activities' });
  }
});

// ==================== INACTIVITY ALERTS ====================

// Log inactivity alert
app.post('/api/inactivity-alerts', async (req, res) => {
  try {
    const alertData = req.body;
    const alert = await db.logInactivityAlert(alertData);
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log inactivity alert' });
  }
});

// Get inactivity alerts by company
app.get('/api/companies/:companyId/inactivity-alerts', async (req, res) => {
  try {
    const alerts = await db.getInactivityAlerts(req.params.companyId);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inactivity alerts' });
  }
});

// ==================== PROCTORING ====================

app.post('/api/proctoring/log', async (req, res) => {
  try {
    const data = req.body;
    const log = await db.logProctoringData(data);
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log proctoring data' });
  }
});

app.get('/api/companies/:companyId/proctoring', async (req, res) => {
  try {
    const logs = await db.getProctoringDataByCompany(req.params.companyId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proctoring data' });
  }
});

// ==================== SALES (LEADS & VISITS) ====================

app.get('/api/leads', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });
    const leads = await db.getLeads(companyId);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ==================== LEAVE MANAGEMENT ====================

// Add Leave Request
app.post('/api/leaverequests', async (req, res) => {
  try {
    const result = await db.addLeaveRequest(req.body);
    if (!result) return res.status(500).json({ error: 'Failed to add leave request' });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error adding leave request' });
  }
});

// Get Company Leave Requests (For HR)
app.get('/api/leaverequests/company/:companyId', async (req, res) => {
  try {
    const requests = await db.getLeaveRequestsByCompany(req.params.companyId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// Get User Leave Requests (For Employee)
app.get('/api/leaverequests/user/:userId', async (req, res) => {
  try {
    const requests = await db.getLeaveRequestsByUser(req.params.userId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user leave requests' });
  }
});

// Update Leave Request Status (Approve/Reject)
app.put('/api/leaverequests/:id', async (req, res) => {
  try {
    const { status, approverId, approverName } = req.body;
    const result = await db.updateLeaveRequestStatus(req.params.id, status, approverId, approverName);
    if (!result) return res.status(404).json({ error: 'Request not found or failed update' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ==================== EVENTS ====================

// Get Events by Company
app.get('/api/events', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });
    const events = await db.getEventsByCompany(companyId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Add Event
app.post('/api/events', async (req, res) => {
  try {
    const eventData = req.body;
    const result = await db.addEvent(eventData);
    if (!result) return res.status(500).json({ error: 'Failed to add event' });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// ==================== RECOGNITIONS ====================

app.post('/api/recognitions', async (req, res) => {
  try {
    const result = await db.addRecognition(req.body);
    if (!result) return res.status(500).json({ error: 'Failed' });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recognitions/:companyId', async (req, res) => {
  try {
    const list = await db.getRecognitionsByCompany(req.params.companyId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== COMPANY FEED ====================

// Get Company Feed
app.get('/api/feed/:companyId', async (req, res) => {
  try {
    const posts = await db.getCompanyFeed(req.params.companyId);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Create Post
app.post('/api/feed', async (req, res) => {
  try {
    const postData = req.body;
    if (!postData.companyId || !postData.content || !postData.author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newPost = await db.addPost(postData);
    if (!newPost) return res.status(500).json({ error: 'Failed to create post' });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Toggle Like
app.post('/api/feed/:postId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const likes = await db.toggleLikePost(req.params.postId, userId);
    if (!likes) return res.status(404).json({ error: 'Post not found' });
    res.json({ likes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Add Comment
app.post('/api/feed/:postId/comment', async (req, res) => {
  try {
    const commentData = req.body; // { author, content, userId, avatar(opt) }
    if (!commentData.content || !commentData.author) {
      return res.status(400).json({ error: 'Missing comment content' });
    }

    const comments = await db.addComment(req.params.postId, commentData);
    if (!comments) return res.status(404).json({ error: 'Post not found' });
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete Post
app.delete('/api/feed/:postId', async (req, res) => {
  try {
    const success = await db.deletePost(req.params.postId);
    if (!success) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ==================== SALES MODULE ====================

// --- VISITS ---
app.post('/api/visits', async (req, res) => {
  try {
    const result = await db.logVisit(req.body);
    if (!result) return res.status(500).json({ error: 'Failed' });

    // Notify HR Dashboard lively
    if (req.body.companyId) {
      io.to(`company_${req.body.companyId}`).emit('visit-logged', result);
    }

    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/visits', async (req, res) => {
  try {
    const { companyId, employeeId } = req.query;
    const list = await db.getVisits(companyId || req.params.companyId, employeeId);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/visits/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      return res.status(400).json({ error: 'Valid Company ID is required' });
    }
    const list = await db.getVisits(companyId);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/visits/:id', async (req, res) => {
  try {
    const success = await db.deleteVisit(req.params.id);
    if (!success) return res.status(404).json({ error: 'Visit not found' });
    res.json({ message: 'Visit deleted successfully', id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LEADS ---
app.post('/api/leads', async (req, res) => {
  try {
    const result = await db.addLead(req.body);
    if (!result) return res.status(500).json({ error: 'Failed' });

    // Notify HR Dashboard lively
    if (req.body.companyId) {
      io.to(`company_${req.body.companyId}`).emit('lead-added', result);
    }

    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leads/:companyId', async (req, res) => {
  try {
    const list = await db.getLeads(req.params.companyId);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const result = await db.updateLead(req.params.id, req.body);

    // Notify lively
    if (req.body.companyId) {
      io.to(`company_${req.body.companyId}`).emit('lead-updated', { id: req.params.id, ...req.body });
    } else {
      io.emit('lead-updated', { id: req.params.id, ...req.body });
    }

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TASKS ---
app.post('/api/tasks', async (req, res) => {
  try {
    const result = await db.addTask(req.body);
    if (!result) return res.status(500).json({ error: 'Failed' });
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tasks/:companyId', async (req, res) => {
  try {
    const list = await db.getTasks(req.params.companyId);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const result = await db.updateTaskStatus(req.params.id, status, notes);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GPS ---
app.post('/api/gps/route', async (req, res) => {
  try {
    await db.addRoutePoint(req.body);
    res.json({ status: 'ok' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gps/route/:userId', async (req, res) => {
  try {
    const list = await db.getDailyRoute(req.params.userId);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gps/stats/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr = date || new Date().toISOString().split('T')[0];
    const stats = await db.getDailyStats(req.params.userId, dateStr);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PROJECT MANAGEMENT ====================

// Create Project
app.post('/api/projects', async (req, res) => {
  try {
    const project = await db.addProject(req.body);
    if (!project) return res.status(500).json({ error: 'Failed to create project' });
    res.status(201).json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Projects
app.get('/api/projects/:companyId', async (req, res) => {
  try {
    const projects = await db.getProjects(req.params.companyId);
    res.json(projects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create Project Task
app.post('/api/project-tasks', async (req, res) => {
  try {
    const task = await db.addProjectTask(req.body);
    if (!task) return res.status(500).json({ error: 'Failed to assign task' });
    res.status(201).json(task);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Project Task Progress
app.put('/api/project-tasks/:taskId', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.updateTaskProgress(req.params.taskId, status);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Projects with Tasks (batch endpoint)
app.get('/api/projects-with-tasks/:companyId', async (req, res) => {
  try {
    const projects = await db.getProjects(req.params.companyId);
    const tasksArray = await Promise.all(
      projects.map(p => db.getProjectTasks(p.id))
    );
    const combined = projects.map((p, i) => ({
      ...p,
      tasks: tasksArray[i] || []
    }));
    res.json(combined);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get User Tasks
app.get('/api/tasks/user/:empId', async (req, res) => {
  try {
    const tasks = await db.getUserTasks(req.params.empId);
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Project Tasks
app.get('/api/tasks/project/:projectId', async (req, res) => {
  try {
    const tasks = await db.getProjectTasks(req.params.projectId);
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==================== SCHEDULER (WEEKLY CLEANUP) ====================
// Check every hour if it's Monday 00:00 to delete messages
setInterval(() => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const hour = now.getHours();

  if (day === 1 && hour === 0) {
    console.log(`[SCHEDULER] It's Monday Midnight. Starting Chat Cleanup...`);
    db.deleteAllMessages();
  }
}, 1000 * 60 * 60); // Run every 1 hour

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room ${userId}`);
  });

  socket.on('tracking-data', (data) => {
    io.to(`company_${data.companyId}`).emit('employee-update', data);
  });

  socket.on('join-company-room', (companyId) => {
    socket.join(`company_${companyId}`);
    console.log(`Socket ${socket.id} joined company room ${companyId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`✅ HRMS Backend Server running on http://${HOST}:${PORT}`);
  console.log(`🔥 Database: CONNECTED TO FIREBASE FIRESTORE`);
  console.log(`📡 Socket.io: READY`);
});
