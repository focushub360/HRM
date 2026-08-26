import { Router } from 'express';
import {
  getMyTeams,
  getTeamById,
  createTeam,
  updateTeam,
  addTeamMembers,
  removeTeamMember,
  setTeamAdmin,
  deleteTeam
} from '../controllers/Teamcontroller.js';

const router = Router();

// GET /api/teams?companyId=&userId=
router.get('/', getMyTeams);

// GET /api/teams/:id
router.get('/:id', getTeamById);

// POST /api/teams
router.post('/', createTeam);

// PATCH /api/teams/:id
router.patch('/:id', updateTeam);

// POST /api/teams/:id/members
router.post('/:id/members', addTeamMembers);

// DELETE /api/teams/:id/members/:memberId
router.delete('/:id/members/:memberId', removeTeamMember);

// PATCH /api/teams/:id/admins  (promote/demote — not yet used by Chat.jsx,
// but wired up so it's available when you add an "admin" toggle to
// TeamSettingsModal later)
router.patch('/:id/admins', setTeamAdmin);

// DELETE /api/teams/:id
router.delete('/:id', deleteTeam);

export default router;