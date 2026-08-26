import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Message from '../models/Message.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Same room convention as chatController.js: plain String(id), matching
// AuthContext's `socket.emit('join-room', String(user.empId || user.id || user.email))`.
const emitToUsers = (req, userIds, event, payload) => {
  const io = req.app.get('io');
  if (!io) return;
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  unique.forEach((uid) => io.to(uid).emit(event, payload));
};

// A person's most reliable identifier — MUST match the id AuthContext used
// to join that person's personal room: user.empId || user.id || user.email.
const resolveUserId = (obj) => String(obj?.userId || obj?.empId || obj?.id || obj?.email || '');

// Every id variant we know for this person (their id, empId, email — any of
// which might be what their own socket actually joined a room under). We
// can't be 100% sure which one AuthContext used for a given account, so we
// keep all of them and emit real-time events to every one of them.
const resolveAltIds = (obj) => [...new Set([obj?.userId, obj?.empId, obj?.id, obj?.email].filter(Boolean).map(String))];

// Flatten a team's member list into every id worth emitting to.
const teamRoomTargets = (team) => team.members.flatMap((m) => [m.userId, ...(m.altIds || [])]);

// companyId is stored as Mongoose Mixed, so it's whatever JS type the
// client sent at creation time (often a number). GET query params are
// always strings, so a naive `{ companyId: req.query.companyId }` match
// silently returns nothing once the stored type and the query type differ
// — this was why a team could be created successfully but not show up
// after a refresh. Matching against both the string and numeric form of
// the same value fixes that regardless of which type got stored.
const companyIdVariants = (companyId) => {
  if (companyId === undefined || companyId === null || companyId === '') return undefined;
  const variants = new Set([String(companyId)]);
  const num = Number(companyId);
  if (!Number.isNaN(num) && String(companyId).trim() !== '') variants.add(num);
  return [...variants];
};

// GET /api/teams?companyId=&userId=
export const getMyTeams = async (req, res) => {
  try {
    const { companyId, userId } = req.query;
    if (!companyId || !userId) {
      return res.status(400).json({ message: 'companyId and userId are required' });
    }

    const variants = companyIdVariants(companyId);

    const teams = await Team.find({
      companyId: { $in: variants },
      'members.userId': userId
    }).sort({ updatedAt: -1 });

    res.status(200).json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ message: 'Failed to fetch teams', error: err.message });
  }
};

// GET /api/teams/:id
export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team id' });

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.status(200).json(team);
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ message: 'Failed to fetch team', error: err.message });
  }
};

// POST /api/teams
// Any employee can create a team. Creator becomes admin automatically.
export const createTeam = async (req, res) => {
  try {
    const { companyId, name, description, createdBy, createdByAltIds, creatorProfile, members, avatarColor, clientTeamId } = req.body;

    if (!companyId || !name?.trim() || !createdBy) {
      return res.status(400).json({ message: 'companyId, name, and createdBy are required' });
    }

    // FIX (team created once but shows/persists twice): idempotent create,
    // exactly like sendMessage's clientMessageId handling. If this exact
    // client-generated id was already saved (double-click before the
    // button disabled itself, a retried request, etc), return the existing
    // team instead of creating a second, genuinely distinct document.
    if (clientTeamId) {
      const existing = await Team.findOne({ clientTeamId });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    const memberMap = new Map();

    const creatorAltIds = [
      ...resolveAltIds({ userId: createdBy, email: creatorProfile?.email }),
      ...(Array.isArray(createdByAltIds) ? createdByAltIds.map(String) : [])
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    memberMap.set(String(createdBy), {
      userId: String(createdBy),
      altIds: creatorAltIds,
      name: creatorProfile?.name || 'You',
      email: creatorProfile?.email || '',
      role: creatorProfile?.role || 'Employee',
      department: creatorProfile?.department || '',
      avatar: creatorProfile?.avatar || ''
    });

    (members || []).forEach((m) => {
      const uid = resolveUserId(m);
      if (!uid) return;
      memberMap.set(uid, {
        userId: uid,
        altIds: resolveAltIds(m),
        name: m.name || 'Member',
        email: m.email || '',
        role: m.role || 'Employee',
        department: m.department || '',
        avatar: m.avatar || m.profileImage || ''
      });
    });

    let team;
    try {
      team = await Team.create({
        companyId,
        name: name.trim(),
        description: description?.trim() || '',
        avatarColor: avatarColor || '#4f46e5',
        createdBy: String(createdBy),
        admins: [String(createdBy)],
        members: Array.from(memberMap.values()),
        clientTeamId: clientTeamId || null
      });
    } catch (createErr) {
      // Race: two requests with the same clientTeamId hit the unique index
      // at almost the same time. Whoever lost the race just fetches the
      // winner's row instead of erroring out or creating a duplicate.
      if (createErr?.code === 11000 && clientTeamId) {
        const winner = await Team.findOne({ clientTeamId });
        if (winner) return res.status(200).json(winner);
      }
      throw createErr;
    }

    emitToUsers(req, teamRoomTargets(team), 'team-updated', { type: 'created', team });

    res.status(201).json(team);
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ message: 'Failed to create team', error: err.message });
  }
};

// PATCH /api/teams/:id  (admin only) — edit name/description/avatarColor
export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, name, description, avatarColor } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team id' });

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (!team.isAdmin(String(userId))) {
      return res.status(403).json({ message: 'Only team admins can edit this team' });
    }

    if (name?.trim()) team.name = name.trim();
    if (description !== undefined) team.description = description.trim();
    if (avatarColor) team.avatarColor = avatarColor;

    await team.save();

    emitToUsers(req, teamRoomTargets(team), 'team-updated', { type: 'edited', team });

    res.status(200).json(team);
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).json({ message: 'Failed to update team', error: err.message });
  }
};

// POST /api/teams/:id/members  (any existing member can add new members)
export const addTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, members } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team id' });
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'members array is required' });
    }

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (!team.isMember(String(userId))) {
      return res.status(403).json({ message: 'Only team members can add people to this team' });
    }

    const existingIds = new Set(team.members.map((m) => m.userId));
    const added = [];

    members.forEach((m) => {
      const uid = resolveUserId(m);
      if (!uid || existingIds.has(uid)) return;
      const entry = {
        userId: uid,
        altIds: resolveAltIds(m),
        name: m.name || 'Member',
        email: m.email || '',
        role: m.role || 'Employee',
        department: m.department || '',
        avatar: m.avatar || m.profileImage || ''
      };
      team.members.push(entry);
      existingIds.add(uid);
      added.push(entry);
    });

    await team.save();

    emitToUsers(req, teamRoomTargets(team), 'team-updated', { type: 'members-added', team, added });

    res.status(200).json(team);
  } catch (err) {
    console.error('Error adding team members:', err);
    res.status(500).json({ message: 'Failed to add members', error: err.message });
  }
};

// DELETE /api/teams/:id/members/:memberId
// Admins can remove anyone. A member can always remove themselves (leave team).
export const removeTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { userId } = req.body; // the actor performing the removal
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team id' });

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const isSelfLeaving = String(userId) === String(memberId);
    if (!isSelfLeaving && !team.isAdmin(String(userId))) {
      return res.status(403).json({ message: 'Only team admins can remove other members' });
    }

    if (String(memberId) === team.createdBy && !isSelfLeaving) {
      return res.status(400).json({ message: 'The team creator cannot be removed by others' });
    }

    const notifyIds = teamRoomTargets(team);

    team.members = team.members.filter((m) => m.userId !== String(memberId));
    team.admins = team.admins.filter((a) => a !== String(memberId));

    if (team.members.length === 0) {
      await Team.findByIdAndDelete(id);
      emitToUsers(req, notifyIds, 'team-updated', { type: 'deleted', teamId: id });
      return res.status(200).json({ success: true, deleted: true });
    }

    await team.save();

    emitToUsers(req, notifyIds, 'team-updated', { type: 'member-removed', team, removedId: memberId });

    res.status(200).json(team);
  } catch (err) {
    console.error('Error removing team member:', err);
    res.status(500).json({ message: 'Failed to remove member', error: err.message });
  }
};

// PATCH /api/teams/:id/admins  (creator/admin only) — promote or demote an admin
export const setTeamAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, targetUserId, makeAdmin } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team id' });

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (!team.isAdmin(String(userId))) {
      return res.status(403).json({ message: 'Only team admins can change admin roles' });
    }
    if (!team.isMember(String(targetUserId))) {
      return res.status(400).json({ message: 'Target user is not a member of this team' });
    }

    if (makeAdmin) {
      if (!team.admins.includes(String(targetUserId))) team.admins.push(String(targetUserId));
    } else {
      team.admins = team.admins.filter((a) => a !== String(targetUserId));
    }

    await team.save();

    emitToUsers(req, teamRoomTargets(team), 'team-updated', { type: 'admin-changed', team });

    res.status(200).json(team);
  } catch (err) {
    console.error('Error updating team admin:', err);
    res.status(500).json({ message: 'Failed to update admin role', error: err.message });
  }
};

// DELETE /api/teams/:id  (creator/admin only)
export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team id' });

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (!team.isAdmin(String(userId))) {
      return res.status(403).json({ message: 'Only team admins can delete this team' });
    }

    const notifyIds = teamRoomTargets(team);

    await Team.findByIdAndDelete(id);
    await Message.deleteMany({ channel: 'team', teamId: id });

    emitToUsers(req, notifyIds, 'team-updated', { type: 'deleted', teamId: id });

    res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ message: 'Failed to delete team', error: err.message });
  }
};