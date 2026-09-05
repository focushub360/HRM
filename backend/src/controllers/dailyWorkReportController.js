import DailyWorkReport from '../models/DailyWorkReport.js';
import ActivityLog from '../models/ActivityLog.js';

// Mongo does exact BSON-type equality. companyId is stored as `Mixed`, so it
// keeps whatever JS type it was saved with (this app treats company IDs as
// numbers almost everywhere — e.g. `c.id === parseInt(user.companyId)`).
// req.query values, on the other hand, are ALWAYS strings. A raw
// `{ companyId: req.query.companyId }` query will therefore silently match
// zero documents whenever the saved value is a number, even though the
// report was saved successfully. Build a query that matches either shape.
const buildFlexibleIdMatch = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && String(asNumber) === String(value).trim()) {
    return { $in: [value, asNumber] };
  }
  return value;
};

export const submitDailyWorkReport = async (req, res) => {
  try {
    const { userId, userName, companyId, date, formattedDate, tasks, generalNotes, checkInTime, checkOutTime, totalSessionDuration, locationAddress } = req.body;

    if (!userId || !companyId || !date) {
      return res.status(400).json({ message: 'userId, companyId, and date are required' });
    }

    const todayDate = date || new Date().toISOString().split('T')[0];

    // Find existing report for this employee on this date or create new.
    // Use the same flexible match here too, in case userId/companyId ever
    // arrive with inconsistent types across requests (e.g. a stale client).
    let report = await DailyWorkReport.findOne({
      userId,
      companyId: buildFlexibleIdMatch(companyId),
      date: todayDate
    });

    if (report) {
      report.tasks = tasks || report.tasks;
      report.generalNotes = generalNotes !== undefined ? generalNotes : report.generalNotes;
      if (checkInTime) report.checkInTime = checkInTime;
      if (checkOutTime) report.checkOutTime = checkOutTime;
      if (totalSessionDuration) report.totalSessionDuration = totalSessionDuration;
      if (locationAddress) report.locationAddress = locationAddress;
      report.submittedAt = new Date().toISOString();
      await report.save();
    } else {
      report = await DailyWorkReport.create({
        userId,
        userName,
        companyId,
        date: todayDate,
        formattedDate: formattedDate || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        tasks: tasks || [],
        generalNotes: generalNotes || '',
        checkInTime: checkInTime || '',
        checkOutTime: checkOutTime || '',
        totalSessionDuration: totalSessionDuration || '',
        locationAddress: locationAddress || '',
        submittedAt: new Date().toISOString()
      });
    }

    // Also record an ActivityLog entry so HR Activity stream reflects this work report
    const tasksCount = (tasks || []).length;
    const completedCount = (tasks || []).filter(t => t.status === 'Completed').length;
    const summaryStr = tasks && tasks.length > 0
      ? tasks.map(t => `${t.title} [${t.status}]`).join(', ')
      : 'Submitted Daily Work Report';

    await ActivityLog.create({
      userId,
      userName,
      companyId,
      action: 'CHECK_OUT_REPORT',
      details: `EOD Checkout Report: ${tasksCount} task(s) (${completedCount} completed) - ${summaryStr}`,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Error submitting daily work report:', error);
    res.status(500).json({ message: 'Failed to submit daily work report', error: error.message });
  }
};

export const getDailyWorkReports = async (req, res) => {
  try {
    const { companyId, date, userId, month } = req.query;
    const query = {};

    const flexibleCompanyId = buildFlexibleIdMatch(companyId);
    if (flexibleCompanyId !== undefined) query.companyId = flexibleCompanyId;
    if (userId) query.userId = userId;
    if (date) query.date = date;
    else if (month) {
      // match YYYY-MM
      query.date = { $regex: `^${month}` };
    }

    const reports = await DailyWorkReport.find(query).sort({ date: -1, submittedAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching daily work reports:', error);
    res.status(500).json({ message: 'Failed to fetch daily work reports', error: error.message });
  }
};

export const getEmployeeDailyReport = async (req, res) => {
  try {
    const { empId } = req.params;
    const { date } = req.query;
    const query = { userId: empId };
    if (date) query.date = date;

    const reports = await DailyWorkReport.find(query).sort({ date: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching employee daily report:', error);
    res.status(500).json({ message: 'Failed to fetch employee daily report', error: error.message });
  }
};