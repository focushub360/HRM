import Message from '../models/Message.js';

const deleteAllMessages = async () => {
  try {
    const result = await Message.deleteMany({});
    console.log(`🧹 Deleted ${result.deletedCount} messages.`);
  } catch (error) {
    console.error('Error cleaning up messages:', error);
  }
};

// Runs an hourly check; performs the actual cleanup only at Monday 00:xx,
// mirroring the previous Firebase-backed implementation.
export const startWeeklyCleanupScheduler = () => {
  setInterval(() => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 1 = Mon
    const hour = now.getHours();

    if (day === 1 && hour === 0) {
      console.log('[SCHEDULER] It\'s Monday Midnight. Starting Chat Cleanup...');
      deleteAllMessages();
    }
  }, 1000 * 60 * 60); // every hour
};