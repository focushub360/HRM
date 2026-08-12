import cron from 'node-cron';
import ActivityLog from '../models/ActivityLog.js';

export const initAttendanceCron = () => {
  // Run every day at 11:30 PM IST
  cron.schedule('30 23 * * *', async () => {
    console.log('[Cron] Running daily attendance auto-checkout job at 11:30 PM...');
    try {
      const todayStr = new Date().toDateString();
      
      // Get all activities for today
      const todayLogs = await ActivityLog.find({
        timestamp: {
          $gte: new Date(todayStr).toISOString()
        }
      });

      // Filter by users who have a CHECK_IN today but no CHECK_OUT
      const userStatus = {};
      
      todayLogs.forEach(log => {
        if (!userStatus[log.userId]) {
          userStatus[log.userId] = {
            userId: log.userId,
            companyId: log.companyId,
            userName: log.userName,
            employeeType: log.employeeType,
            hasCheckIn: false,
            hasCheckOut: false,
            lastActivity: null
          };
        }
        
        if (log.action === 'CHECK_IN') {
          userStatus[log.userId].hasCheckIn = true;
          userStatus[log.userId].lastActivity = log;
        } else if (log.action === 'CHECK_OUT' || log.action === 'AUTO_CHECK_OUT') {
          userStatus[log.userId].hasCheckOut = true;
        }
      });

      const usersToAutoCheckout = Object.values(userStatus).filter(
        user => user.hasCheckIn && !user.hasCheckOut
      );

      console.log(`[Cron] Found ${usersToAutoCheckout.length} users requiring auto-checkout.`);

      const now = new Date().toISOString();
      const checkOutLogs = usersToAutoCheckout.map(user => ({
        userId: user.userId,
        companyId: user.companyId,
        userName: user.userName,
        employeeType: user.employeeType,
        action: 'AUTO_CHECK_OUT',
        details: 'Auto Check-Out at 11:30 PM',
        latitude: user.lastActivity?.latitude,
        longitude: user.lastActivity?.longitude,
        timestamp: now
      }));

      if (checkOutLogs.length > 0) {
        await ActivityLog.insertMany(checkOutLogs);
        console.log(`[Cron] Successfully auto-checked out ${checkOutLogs.length} employees.`);
      }
    } catch (error) {
      console.error('[Cron] Error running attendance auto-checkout:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};
