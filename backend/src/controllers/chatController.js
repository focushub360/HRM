import Message from '../models/Message.js';
import Team from '../models/Team.js';

// ---------------------------------------------------------------------------
// Socket helpers
//
// Your AuthContext.jsx joins EVERY connected client into two plain rooms
// (no "user:" / "company:" prefix — just the raw id as a string):
//   socket.emit('join-room', String(user.empId || user.id))   -> personal room
//   socket.emit('join-room', String(user.companyId))          -> company room
// registerSocketHandlers.js turns each of those into socket.join(String(id)).
// So server-side emits MUST target io.to(String(id)) with that exact same id,
// no prefix. That's what this file does below.
//
// IMPORTANT: req.app.get('io') requires your server.js to have called
// app.set('io', io) once, in addition to registerSocketHandlers(io). If you
// only call registerSocketHandlers(io) and never app.set('io', io), every
// emit in this file will silently no-op.
// ---------------------------------------------------------------------------

const emitToUsers = (req, userIds, event, payload) => {
  const io = req.app.get('io');
  if (!io) return;
  const unique = [...new Set((userIds || []).filter(Boolean).map(String))];
  unique.forEach((uid) => io.to(uid).emit(event, payload));
};

const emitToCompany = (req, companyId, event, payload) => {
  const io = req.app.get('io');
  if (!io || !companyId) return;
  io.to(String(companyId)).emit(event, payload);
};

// Flatten a team's member list into every id worth emitting to (their
// canonical userId plus every known altId — see models/Team.js).
const teamRoomTargets = (team) => team.members.flatMap((m) => [m.userId, ...(m.altIds || [])]);

// companyId is stored as Mongoose Mixed, so whatever JS type the client
// happened to send when a message/team was CREATED (often a number) gets
// stored as-is. But every READ (GET query string) arrives as a plain
// string, since URL query params are always strings. MongoDB does strict
// type matching, so `{ companyId: "1" }` will never match a stored
// `companyId: 1` (number) — this is why teams/messages could be created
// successfully but vanish on the next fetch/refresh. Matching against both
// the string and (if numeric) the number form fixes that regardless of
// which type any given document happens to be stored as.
const companyIdVariants = (companyId) => {
  if (companyId === undefined || companyId === null || companyId === '') return undefined;
  const variants = new Set([String(companyId)]);
  const num = Number(companyId);
  if (!Number.isNaN(num) && String(companyId).trim() !== '') variants.add(num);
  return [...variants];
};

// Build the Mongo query for a given chat context. Shared by getMessages,
// markRead, so the "who can see this" rule only lives in one place.
const buildContextQuery = ({ companyId, channel, targetGroup, teamId, senderId, receiverId }) => {
  const query = {};
  const variants = companyIdVariants(companyId);
  if (variants) query.companyId = { $in: variants };

  if (channel === 'dm') {
    query.channel = 'dm';
    if (senderId && receiverId) {
      query.$or = [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ];
    }
  } else if (channel === 'team') {
    query.channel = 'team';
    if (teamId) query.teamId = teamId;
  } else if (channel) {
    query.channel = channel;
    if (channel === 'broadcast' && targetGroup) {
      query.targetGroup = targetGroup;
    }
  }

  return query;
};

// GET /api/chat/messages
export const getMessages = async (req, res) => {
  try {
    const { companyId, channel, targetGroup, teamId, senderId, receiverId, viewerId } = req.query;
    const query = buildContextQuery({ companyId, channel, targetGroup, teamId, senderId, receiverId });

    const messages = await Message.find(query).sort({ createdAt: 1, _id: 1 });

    // Mark everything the viewer just fetched (and didn't send) as DELIVERED.
    // This models "their client is now in sync", the WhatsApp grey double tick.
    const currentViewer = viewerId || senderId;
    if (currentViewer) {
      const idsToMark = messages
        .filter((m) => m.senderId !== currentViewer && !m.deliveredTo.includes(currentViewer))
        .map((m) => m._id);

      if (idsToMark.length > 0) {
        await Message.updateMany(
          { _id: { $in: idsToMark } },
          { $addToSet: { deliveredTo: currentViewer } }
        );
        const bySender = {};
        messages
          .filter((m) => idsToMark.some((id) => String(id) === String(m._id)))
          .forEach((m) => {
            bySender[m.senderId] = bySender[m.senderId] || [];
            bySender[m.senderId].push(String(m._id));
          });
        Object.entries(bySender).forEach(([sid, ids]) => {
          emitToUsers(req, [sid], 'messages-delivered', { messageIds: ids, by: currentViewer });
        });
      }
    }

    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
};

// PATCH /api/chat/messages/read
// Call this when a user actively opens/focuses a specific conversation.
// body: { companyId, channel, targetGroup, teamId, senderId (=me), receiverId, userId }
export const markRead = async (req, res) => {
  try {
    const { companyId, channel, targetGroup, teamId, senderId, receiverId, userId } = req.body;
    const me = userId || senderId;
    if (!me) return res.status(400).json({ message: 'userId is required' });

    const query = buildContextQuery({
      companyId,
      channel,
      targetGroup,
      teamId,
      senderId: me,
      receiverId
    });
    query.senderId = { $ne: me };

    const toUpdate = await Message.find(query, { _id: 1, senderId: 1 });
    if (toUpdate.length === 0) return res.status(200).json({ updated: 0 });

    await Message.updateMany(
      { _id: { $in: toUpdate.map((m) => m._id) } },
      { $addToSet: { readBy: me, deliveredTo: me } }
    );

    const bySender = {};
    toUpdate.forEach((m) => {
      bySender[m.senderId] = bySender[m.senderId] || [];
      bySender[m.senderId].push(String(m._id));
    });
    Object.entries(bySender).forEach(([sid, ids]) => {
      emitToUsers(req, [sid], 'messages-read', { messageIds: ids, by: me });
    });

    res.status(200).json({ updated: toUpdate.length });
  } catch (err) {
    console.error('Error marking messages read:', err);
    res.status(500).json({ message: 'Failed to mark messages read', error: err.message });
  }
};

// POST /api/chat/messages/:id/delivered
// Called by a client the instant it receives a live socket message, so the
// sender sees the "delivered" tick even before the recipient opens the chat.
export const markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const message = await Message.findByIdAndUpdate(
      id,
      { $addToSet: { deliveredTo: userId } },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found' });

    emitToUsers(req, [message.senderId], 'messages-delivered', {
      messageIds: [String(message._id)],
      by: userId
    });

    res.status(200).json(message);
  } catch (err) {
    console.error('Error marking message delivered:', err);
    res.status(500).json({ message: 'Failed to mark delivered', error: err.message });
  }
};

// POST /api/chat/messages
export const sendMessage = async (req, res) => {
  try {
    const {
      companyId,
      channel,
      targetGroup,
      teamId,
      senderId,
      senderName,
      senderRole,
      senderAvatar,
      receiverId,
      receiverName,
      receiverCandidates,
      content,
      attachments,
      clientMessageId
    } = req.body;

    if (!companyId || !senderId || !content?.trim()) {
      return res.status(400).json({ message: 'companyId, senderId, and content are required' });
    }
    if (channel === 'team' && !teamId) {
      return res.status(400).json({ message: 'teamId is required for team messages' });
    }
    if (channel === 'dm' && !receiverId) {
      return res.status(400).json({ message: 'receiverId is required for direct messages' });
    }

    // Idempotent send: if this exact client-generated id was already saved
    // (double-click, retry, StrictMode re-fire, flaky network causing a
    // resend, etc), just return the existing message instead of creating a
    // duplicate. This is what actually prevents duplicate bubbles — the
    // client-side reconciliation only hides duplicates cosmetically, this
    // stops them from ever existing twice in the database in the first place.
    if (clientMessageId) {
      const existing = await Message.findOne({ clientMessageId });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    let team = null;
    if (channel === 'team') {
      team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ message: 'Team not found' });
      if (!team.isMember(String(senderId))) {
        return res.status(403).json({ message: 'You are not a member of this team' });
      }
    }

    let message;
    try {
      message = await Message.create({
        companyId,
        channel: channel || 'company',
        teamId: channel === 'team' ? teamId : null,
        targetGroup: targetGroup || 'General',
        senderId,
        senderName: senderName || 'User',
        senderRole: senderRole || 'employee',
        senderAvatar: senderAvatar || '',
        receiverId: channel === 'dm' ? receiverId : '',
        receiverName: channel === 'dm' ? receiverName || '' : '',
        content: content.trim(),
        attachments: attachments || [],
        clientMessageId: clientMessageId || null
      });
    } catch (createErr) {
      // Race: two requests with the same clientMessageId hit the unique
      // index at almost the same time. Whoever lost the race just fetches
      // the winner's row instead of erroring out.
      if (createErr?.code === 11000 && clientMessageId) {
        const winner = await Message.findOne({ clientMessageId });
        if (winner) return res.status(200).json(winner);
      }
      throw createErr;
    }

    // Deliver in real time to exactly the people who should see it.
    // For DMs, emit to every known id variant of the receiver (not just the
    // one canonical id we stored on the message) — that hedges against the
    // receiver's socket having joined its room under a different id field
    // (id vs empId vs email) than what got sent as receiverId.
    if (channel === 'dm') {
      const dmTargets = [receiverId, senderId, ...(Array.isArray(receiverCandidates) ? receiverCandidates : [])];
      emitToUsers(req, dmTargets, 'new-chat-message', message);
    } else if (channel === 'team' && team) {
      emitToUsers(req, teamRoomTargets(team), 'new-chat-message', message);
    } else {
      // company / hr / broadcast — everyone in the company room sees it,
      // client filters broadcast by targetGroup as before.
      emitToCompany(req, companyId, 'new-chat-message', message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending chat message:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

// DELETE /api/chat/messages/:id
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByIdAndDelete(id);
    if (message) {
      emitToCompany(req, message.companyId, 'message-deleted', { id });
      if (message.channel === 'dm') {
        emitToUsers(req, [message.senderId, message.receiverId], 'message-deleted', { id });
      }
      if (message.channel === 'team' && message.teamId) {
        const team = await Team.findById(message.teamId);
        if (team) {
          emitToUsers(req, teamRoomTargets(team), 'message-deleted', { id });
        }
      }
    }
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
};