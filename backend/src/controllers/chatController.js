import Message from '../models/Message.js';

export const getMessages = async (req, res) => {
  try {
    const { companyId, channel, targetGroup, senderId, receiverId } = req.query;
    const query = {};

    if (companyId) query.companyId = companyId;

    if (channel === 'dm') {
      query.channel = 'dm';
      if (senderId && receiverId) {
        query.$or = [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId }
        ];
      }
    } else if (channel) {
      query.channel = channel;
      if (channel === 'team' || channel === 'broadcast') {
        if (targetGroup) query.targetGroup = targetGroup;
      }
    }

    const messages = await Message.find(query).sort({ createdAt: 1, _id: 1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { companyId, channel, targetGroup, senderId, senderName, senderRole, senderAvatar, receiverId, receiverName, content, attachments } = req.body;

    if (!companyId || !senderId || !content) {
      return res.status(400).json({ message: 'companyId, senderId, and content are required' });
    }

    const message = await Message.create({
      companyId,
      channel: channel || 'company',
      targetGroup: targetGroup || 'General',
      senderId,
      senderName: senderName || 'User',
      senderRole: senderRole || 'employee',
      senderAvatar: senderAvatar || '',
      receiverId: receiverId || '',
      receiverName: receiverName || '',
      content: content.trim(),
      attachments: attachments || [],
      createdAt: new Date().toISOString()
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending chat message:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
};
