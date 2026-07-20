import { db } from './firebaseService.js';

// Helper to convert Firestore snapshot to array
const snapshotToArray = (snapshot) => {
  if (snapshot.empty) return [];
  const items = [];
  snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
  return items;
};

// Distance Helper (KM)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

// ==================== COMPANIES ====================

// Get all companies
export const getCompanies = async () => {
  try {
    const snapshot = await db.collection('companies').get();
    return snapshotToArray(snapshot);
  } catch (error) {
    console.error('Error getting companies:', error);
    return [];
  }
};

// Get company by ID
export const getCompanyById = async (id) => {
  try {
    const docRef = db.collection('companies').doc(String(id));
    const doc = await docRef.get();
    if (doc.exists) return { id: doc.id, ...doc.data() };

    const snapshot = await db.collection('companies').where('id', '==', parseInt(id)).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting company:', error);
    return null;
  }
};

// Add company
export const addCompany = async (companyData) => {
  try {
    const all = await getCompanies();
    const newId = (all.length > 0 ? Math.max(...all.map(c => c.id || 0)) : 0) + 1;

    const newCompany = {
      id: newId,
      ...companyData,
      subdomain: companyData.subdomain || "",
      portalUrl: companyData.portalUrl || "",
      contactEmail: companyData.contactEmail || "",
      employees: 0,
      hrCount: 0,
      status: "Active",
      createdDate: new Date().toLocaleDateString(),
      hrAccounts: [],
      employeeAccounts: [],
      admin: {
        name: "Admin User",
        email: "admin@focus.com",
        password: "Focus@123"
      }
    };

    await db.collection('companies').doc(String(newId)).set(newCompany);
    return newCompany;
  } catch (error) {
    console.error('Error adding company:', error);
    throw error;
  }
};

// Update company
export const updateCompany = async (id, companyData) => {
  try {
    const companyRef = db.collection('companies').doc(String(id));
    await companyRef.update(companyData);
    // Fetch and return the full, latest company object
    const updatedCompany = await getCompanyById(id);
    return updatedCompany;
  } catch (error) {
    console.error('Error updating company:', error);
    return null;
  }
};

// Remove company
export const removeCompany = async (id) => {
  try {
    const company = await getCompanyById(id);
    if (company) {
      await db.collection('companies').doc(String(company.id)).delete();
    }
    return true;
  } catch (error) {
    console.error('Error removing company:', error);
    return false;
  }
};

// ==================== SETTINGS & CREDENTIALS ====================

export const getCompanyCredentials = async (companyId) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    return {
      admin: company.admin,
      hrAccounts: company.hrAccounts || [],
      employeeAccounts: company.employeeAccounts || []
    };
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return null;
  }
};

export const updateCompanySettings = async (companyId, settingsData) => {
  try {
    const companyRef = db.collection('companies').doc(String(companyId));
    await companyRef.update(settingsData);
    return { id: companyId, ...settingsData };
  } catch (error) {
    console.error('Error updating company settings:', error);
    return null;
  }
};


// ==================== UTILS ====================
export const generatePassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};


// ==================== HR ACCOUNTS ====================
export const addHRToCompany = async (companyId, hrData) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    const empId = `HR-${company.code}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const password = generatePassword();
    const newHR = {
      id: (company.hrAccounts?.length || 0) + 1,
      name: hrData.name,
      email: hrData.email,
      empId,
      password,
      createdDate: new Date().toLocaleDateString(),
      status: "Active",
    };

    const updatedHrs = [...(company.hrAccounts || []), newHR];
    await db.collection('companies').doc(String(company.id)).update({
      hrAccounts: updatedHrs,
      hrCount: updatedHrs.length
    });

    return { hrAccount: newHR, companyId: company.id };
  } catch (error) {
    console.error('Error adding HR:', error);
    return null;
  }
};

export const removeHRFromCompany = async (companyId, hrId) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return false;

    const updatedHrs = company.hrAccounts.filter(h => h.id !== parseInt(hrId));
    await db.collection('companies').doc(String(company.id)).update({
      hrAccounts: updatedHrs,
      hrCount: updatedHrs.length
    });
    return true;
  } catch (error) {
    console.error('Error deleting HR:', error);
    return false;
  }
};

export const updateHRStatus = async (companyId, hrId, status) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    const updatedHrs = company.hrAccounts.map(h =>
      h.id === parseInt(hrId) ? { ...h, status } : h
    );

    await db.collection('companies').doc(String(company.id)).update({
      hrAccounts: updatedHrs
    });

    return updatedHrs.find(h => h.id === parseInt(hrId));
  } catch (error) {
    console.error('Error updating HR status:', error);
    return null;
  }
};

export const updateHRInCompany = async (companyId, hrId, updateData) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    const hrIdInt = parseInt(hrId);
    let updatedHR = null;

    const updatedHrs = company.hrAccounts.map(h => {
      if (h.id === hrIdInt) {
        updatedHR = { ...h, ...updateData };
        return updatedHR;
      }
      return h;
    });

    if (!updatedHR) return null;

    await db.collection('companies').doc(String(company.id)).update({
      hrAccounts: updatedHrs
    });

    return { ...updatedHR, companyId: company.id, type: 'hr', role: 'hr' };
  } catch (error) {
    console.error('Error updating HR:', error);
    return null;
  }
};

export const updateCompanyAdmin = async (companyId, updateData) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    const currentAdmin = company.admin || {};
    const updatedAdmin = { ...currentAdmin, ...updateData };

    await db.collection('companies').doc(String(company.id)).update({
      admin: updatedAdmin
    });

    return { ...updatedAdmin, companyId: company.id, type: 'company', role: 'admin' };
  } catch (error) {
    console.error('Error updating Company Admin:', error);
    return null;
  }
};

// ==================== EMPLOYEE ACCOUNTS ====================
export const addEmployeeToCompany = async (companyId, employeeData) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    const empId = `EMP-${company.code}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const password = generatePassword();

    const newEmpFull = {
      id: (company.employeeAccounts?.length || 0) + 1,
      name: employeeData.name || "Unknown",
      email: employeeData.email || "No Email",
      empId,
      password,
      employeeType: employeeData.employeeType || 'office',
      department: employeeData.department || "Unassigned",
      position: employeeData.position || "TBD",
      joiningDate: employeeData.joiningDate || null,
      salary: employeeData.salary || null,
      reportingManager: employeeData.reportingManager || null,
      aadharDoc: employeeData.aadharDoc || null,
      certificates: employeeData.certificates || [],
      // Head HR (Ownership)
      headHrId: employeeData.headHrId || null,
      headHrName: employeeData.headHrName || null,
      headHrEmail: employeeData.headHrEmail || null,
      phone: employeeData.phone || null,
      address: {
        street: employeeData.street || null,
        city: employeeData.city || null,
        state: employeeData.state || null,
        country: employeeData.country || null,
        postalCode: employeeData.postalCode || null
      },
      createdDate: new Date().toLocaleDateString(),
      status: "Active",
    };

    const newEmpSummary = {
      ...newEmpFull,
      aadharDoc: null,
      certificates: (newEmpFull.certificates || []).length
    };

    delete newEmpSummary.aadharDoc;

    await db.collection('companies').doc(String(company.id))
      .collection('employeeAccounts').doc(String(newEmpFull.id)).set(newEmpFull);

    const updatedEmps = [...(company.employeeAccounts || []), newEmpSummary];
    await db.collection('companies').doc(String(company.id)).update({
      employeeAccounts: updatedEmps,
      employees: updatedEmps.length
    });

    console.log(`[DB] Added employee ${empId} to Company ${companyId}`);
    return { employeeAccount: newEmpSummary, companyId: company.id };
  } catch (error) {
    console.error('Error adding employee:', error);
    return null;
  }
};

export const removeEmployeeFromCompany = async (companyId, employeeId) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return false;

    const updatedEmps = company.employeeAccounts.filter(e => e.id !== parseInt(employeeId));
    await db.collection('companies').doc(String(company.id)).update({
      employeeAccounts: updatedEmps,
      employees: updatedEmps.length
    });
    return true;
  } catch (error) {
    console.error('Error removing employee:', error);
    return false;
  }
};

export const updateEmployeeInCompany = async (companyId, employeeId, updateData) => {
  try {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    const empIdNum = parseInt(employeeId);
    const empDocRef = db.collection('companies').doc(String(company.id))
      .collection('employeeAccounts').doc(String(empIdNum));

    const empDoc = await empDocRef.get();
    if (!empDoc.exists) {
      console.error("Employee sub-doc not found");
      return null;
    }

    const currentData = empDoc.data();
    const updatedFull = { ...currentData, ...updateData };

    await empDocRef.update(updateData);

    const summaryUpdate = { ...updateData };
    delete summaryUpdate.aadharDoc;
    const updatedEmps = company.employeeAccounts.map(e => {
      if (e.id === empIdNum) {
        return { ...e, ...summaryUpdate };
      }
      return e;
    });
    await db.collection('companies').doc(String(company.id)).update({
      employeeAccounts: updatedEmps
    });

    return { ...updatedFull, companyId: company.id, type: 'employee', role: 'employee' };
  } catch (error) {
    console.error('Error updating employee:', error);
    return null;
  }
};

export const authenticateUser = async (type, email, password) => {
  try {
    const cleanEmail = email ? email.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    const allCompanies = await getCompanies();
    console.log(`[AUTH DEBUG] Checking ${type} login for email: '${cleanEmail}'`);
    console.log(`[AUTH DEBUG] Found ${allCompanies.length} companies in DB`);

    if (type === 'company' || type === 'company_admin') {
      for (const company of allCompanies) {
        if (company.admin && company.admin.email === cleanEmail) {
          console.log('[AUTH DEBUG] Email match found. Checking password...');
          if (company.admin.password === cleanPassword) {
            console.log('[AUTH DEBUG] Password MATCH');
            return {
              ...company.admin,
              type: 'company',
              companyId: company.id,
              companyName: company.name,
              role: 'admin'
            };
          } else {
            console.log(`[AUTH DEBUG] Password MISMATCH. Input: '${cleanPassword}', Stored: '${company.admin.password}'`);
          }
        }
      }
    }

    if (type === 'hr') {
      for (const company of allCompanies) {
        const match = company.hrAccounts?.find(h => h.email === cleanEmail && h.password === cleanPassword);
        if (match) {
          if (match.status === 'Inactive') {
            console.log('[AUTH DEBUG] Login blocked: User is Inactive');
            return { error: 'INACTIVE_ACCOUNT' };
          }
          return { ...match, type: 'hr', companyId: company.id, role: 'hr' };
        }
      }
    }

    if (type === 'employee') {
      for (const company of allCompanies) {
        const match = company.employeeAccounts?.find(e => e.email === cleanEmail && e.password === cleanPassword);
        if (match) {
          return { ...match, type: 'employee', companyId: company.id, role: 'employee' };
        }
      }
    }

    for (const company of allCompanies) {
      if (type !== 'employee' && company.employeeAccounts?.find(e => e.email === cleanEmail && e.password === cleanPassword)) {
        return { error: 'WRONG_ROLE', actualRole: 'employee' };
      }
      if (type !== 'hr' && company.hrAccounts?.find(h => h.email === cleanEmail && h.password === cleanPassword)) {
        return { error: 'WRONG_ROLE', actualRole: 'hr' };
      }
      if (type !== 'company' && company.admin && company.admin.email === cleanEmail && company.admin.password === cleanPassword) {
        return { error: 'WRONG_ROLE', actualRole: 'company' };
      }
    }

    return null;
  } catch (error) {
    console.error('Auth Error:', error);
    return null;
  }
};

export const changePassword = async (type, userId, companyId, oldPassword, newPassword) => {
  try {
    const cleanOld = oldPassword ? oldPassword.trim() : '';
    const cleanNew = newPassword ? newPassword.trim() : '';
    const companyIdStr = String(companyId);

    const company = await getCompanyById(companyId);
    if (!company) return { error: 'Company not found' };

    let user = null;
    let collectionRef = db.collection('companies').doc(companyIdStr);

    if (type === 'company' || type === 'admin') {
      if (company.admin && company.admin.password === cleanOld) {
        user = company.admin;
        await collectionRef.update({ 'admin.password': cleanNew });
      }
    } else if (type === 'hr') {
      const hrIndex = company.hrAccounts.findIndex(h => (String(h.id) === String(userId) || h.empId === userId));
      if (hrIndex !== -1 && company.hrAccounts[hrIndex].password === cleanOld) {
        const updatedHrs = [...company.hrAccounts];
        updatedHrs[hrIndex] = { ...updatedHrs[hrIndex], password: cleanNew };
        await collectionRef.update({ hrAccounts: updatedHrs });
        user = updatedHrs[hrIndex];
      }
    } else if (type === 'employee') {
      const empIndex = company.employeeAccounts.findIndex(e => (String(e.id) === String(userId) || e.empId === userId));
      if (empIndex !== -1 && company.employeeAccounts[empIndex].password === cleanOld) {
        const empIdNum = company.employeeAccounts[empIndex].id;

        await collectionRef.collection('employeeAccounts').doc(String(empIdNum)).update({ password: cleanNew });

        const updatedEmps = [...company.employeeAccounts];
        updatedEmps[empIndex] = { ...updatedEmps[empIndex], password: cleanNew };
        await collectionRef.update({ employeeAccounts: updatedEmps });
        user = updatedEmps[empIndex];
      }
    }

    if (!user) {
      return { error: 'Invalid old password or user not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Change Password Error:', error);
    return { error: 'Server error' };
  }
};


// ==================== ACTIVITY LOGS ====================
export const logActivity = async (activityData) => {
  try {
    const newLog = {
      ...activityData,
      timestamp: new Date().toISOString()
    };
    await db.collection('activityLogs').add(newLog);
    return newLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

export const deleteActivity = async (id) => {
  try {
    await db.collection('activityLogs').doc(id).delete();
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
};

export const getActivityLogsByUser = async (empId) => {
  const snapshot = await db.collection('activityLogs').where('userId', '==', empId).get();
  return snapshotToArray(snapshot);
};

export const getActivityLogsByCompany = async (companyId) => {
  let snapshot = await db.collection('activityLogs').where('companyId', '==', String(companyId)).get();

  if (snapshot.empty) {
    snapshot = await db.collection('activityLogs').where('companyId', '==', parseInt(companyId)).get();
  }

  return snapshotToArray(snapshot);
};


// ==================== INACTIVITY / ALERTS ====================
export const logInactivityAlert = async (alertData) => {
  try {
    const newAlert = { ...alertData, timestamp: new Date().toISOString() };
    await db.collection('inactivityAlerts').add(newAlert);
    return newAlert;
  } catch (error) {
    console.error('Error logging alert:', error);
    return null;
  }
};

export const getInactivityAlerts = async (companyId) => {
  try {
    const alertsRef = db.collection('inactivityAlerts');
    const [snap1, snap2] = await Promise.all([
      alertsRef.where('companyId', '==', parseInt(companyId)).get(),
      alertsRef.where('companyId', '==', String(companyId)).get()
    ]);

    const alerts = [];
    const addDocs = (snap) => {
      snap.forEach(doc => {
        if (!alerts.find(a => a.id === doc.id)) {
          alerts.push({ id: doc.id, ...doc.data() });
        }
      });
    };
    addDocs(snap1);
    addDocs(snap2);

    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error("Error fetching inactivity alerts:", error);
    return [];
  }
};


// ==================== PROCTORING ====================
export const logProctoringData = async (data) => {
  try {
    const newLog = {
      ...data,
      serverTimestamp: new Date().toISOString()
    };
    await db.collection('proctoringLogs').add(newLog);
    return newLog;
  } catch (error) {
    console.error('Error logging proctoring data:', error);
    return null;
  }
};

export const getProctoringDataByCompany = async (companyId) => {
  try {
    const snapshot = await db.collection('proctoringLogs')
      .where('companyId', 'in', [parseInt(companyId), String(companyId)])
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    return snapshotToArray(snapshot);
  } catch (error) {
    console.error("Error fetching proctoring data:", error);
    return [];
  }
};


// ==================== LEADS MANAGEMENT ====================
export const getLeads = async (companyId) => {
  try {
    const cid = isNaN(companyId) ? companyId : parseInt(companyId);
    const snapshot = await db.collection('leads')
      .where('companyId', '==', cid)
      .get();
    return snapshotToArray(snapshot);
  } catch (error) {
    console.error('Error getting leads:', error);
    return [];
  }
};

export const addLead = async (leadData) => {
  try {
    const newLead = {
      ...leadData,
      status: 'New',
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('leads').add(newLead);

    await logActivity({
      userId: leadData.salesPersonId || leadData.userId,
      companyId: leadData.companyId,
      action: 'LEAD_CREATED',
      details: `New Lead: ${newLead.businessName || newLead.contactName || 'Client'}`,
      latitude: leadData.latitude || null,
      longitude: leadData.longitude || null,
      userName: leadData.userName || 'Sales Agent',
      employeeType: 'sales'
    });

    return { id: docRef.id, ...newLead };
  } catch (error) {
    console.error('Error adding lead:', error);
    return null;
  }
};

// ==================== VISITS MANAGEMENT ====================
export const getVisits = async (companyId, employeeId = null) => {
  try {
    const cid = isNaN(companyId) ? companyId : parseInt(companyId);

    // Query by both number and string to be safe for transitions
    const snap1 = await db.collection('visits').where('companyId', '==', cid).get();
    const snap2 = await db.collection('visits').where('companyId', '==', String(companyId)).get();

    let allDocs = [...snap1.docs, ...snap2.docs];

    // Unique by document ID
    const uniqueDocs = [];
    const seenIds = new Set();
    for (const doc of allDocs) {
      if (!seenIds.has(doc.id)) {
        uniqueDocs.push({ id: doc.id, ...doc.data() });
        seenIds.add(doc.id);
      }
    }

    if (employeeId) {
      allDocs = uniqueDocs.filter(d => d.userId === employeeId);
    } else {
      allDocs = uniqueDocs;
    }

    return allDocs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error getting visits:', error);
    return [];
  }
};

export const logVisit = async (visitData) => {
  try {
    const companyId = isNaN(visitData.companyId) ? visitData.companyId : parseInt(visitData.companyId);
    const newVisit = {
      ...visitData,
      companyId,
      timestamp: new Date().toISOString()
    };
    const docRef = await db.collection('visits').add(newVisit);

    await logActivity({
      userId: visitData.userId,
      companyId: companyId, // Use parsed numeric companyId
      action: 'CLIENT_VISIT',
      details: `Visited ${visitData.clientName || 'Client'} - ${visitData.notes || 'Field Visit'}`,
      latitude: visitData.latitude,
      longitude: visitData.longitude,
      userName: visitData.userName || 'Sales Agent',
      employeeType: 'sales'
    });

    return { id: docRef.id, ...newVisit };
  } catch (error) {
    console.error('Error logging visit:', error);
    return null;
  }
};
export const deleteVisit = async (visitId) => {
  try {
    await db.collection('visits').doc(visitId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting visit:', error);
    return false;
  }
};


// ==================== LEAVE MANAGEMENT ====================

export const addLeaveRequest = async (requestData) => {
  try {
    const newRequest = {
      ...requestData,
      status: 'Pending',
      requestDate: new Date().toISOString()
    };
    const docRef = await db.collection('leaveRequests').add(newRequest);
    return { id: docRef.id, ...newRequest };
  } catch (error) {
    console.error('Error adding leave request:', error);
    return null;
  }
};

export const getLeaveRequestsByCompany = async (companyId) => {
  try {
    const snapshot = await db.collection('leaveRequests')
      .where('companyId', '==', parseInt(companyId) || String(companyId))
      .get();
    return snapshotToArray(snapshot);
  } catch (error) {
    console.error('Error getting specific leave requests:', error);
    return [];
  }
};

export const getLeaveRequestsByUser = async (userId) => {
  try {
    const snapshot = await db.collection('leaveRequests')
      .where('userId', '==', userId)
      .get();
    return snapshotToArray(snapshot);
  } catch (error) {
    console.error('Error getting user leave requests:', error);
    return [];
  }
};

export const updateLeaveRequestStatus = async (requestId, status, approverId, approverName) => {
  try {
    const docRef = db.collection('leaveRequests').doc(requestId);
    const updateData = {
      status,
      approverId,
      approverName,
      approvalDate: new Date().toISOString()
    };

    await docRef.update(updateData);

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error updating leave request:', error);
    return null;
  }
};

// ==================== EVENTS ====================

export const addEvent = async (eventData) => {
  try {
    const newEvent = {
      ...eventData,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('events').add(newEvent);
    return { id: docRef.id, ...newEvent };
  } catch (error) {
    console.error('Error adding event:', error);
    return null;
  }
};

export const getEventsByCompany = async (companyId) => {
  try {
    const eventsRef = db.collection('events');
    const companyIdInt = parseInt(companyId);
    const companyIdStr = String(companyId);

    const [snap1, snap2] = await Promise.all([
      eventsRef.where('companyId', '==', companyIdInt).get(),
      eventsRef.where('companyId', '==', companyIdStr).get()
    ]);

    const events = [];
    const addDocs = (snap) => {
      snap.forEach(doc => {
        if (!events.find(e => e.id === doc.id)) {
          events.push({ id: doc.id, ...doc.data() });
        }
      });
    };

    addDocs(snap1);
    addDocs(snap2);

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
};

// ==================== RECOGNITIONS ====================

export const addRecognition = async (data) => {
  try {
    const newRec = {
      ...data,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };
    const res = await db.collection('recognitions').add(newRec);
    return { id: res.id, ...newRec };
  } catch (error) {
    console.error("Error adding recognition:", error);
    return null;
  }
};

export const getRecognitionsByCompany = async (companyId) => {
  try {
    const cid = isNaN(companyId) ? companyId : parseInt(companyId);

    const snapshot = await db.collection('recognitions')
      .where('companyId', '==', cid)
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error getting recognitions:", error);
    return [];
  }
};

// ==================== COMPANY FEED ====================

export async function addPost(postData) {
  try {
    const postRef = db.collection('posts').doc();
    const newPost = {
      id: postRef.id,
      ...postData,
      likes: [],
      comments: [],
      timestamp: new Date().toISOString()
    };
    await postRef.set(newPost);
    return newPost;
  } catch (error) {
    console.error("Error adding post:", error);
    return null;
  }
}

export async function getCompanyFeed(companyId) {
  try {
    if (companyId === 'global') {
      const snapshot = await db.collection('posts').get();
      let posts = [];
      snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
      posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return posts;
    }

    const ids = [String(companyId)];
    const numId = parseInt(companyId);
    if (!isNaN(numId)) ids.push(numId);

    const snapshot = await db.collection('posts')
      .where('companyId', 'in', ids)
      .get();

    let posts = [];
    snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return posts;
  } catch (error) {
    console.error("Error fetching feed:", error);
    return [];
  }
}

export async function toggleLikePost(postId, userId) {
  try {
    const postRef = db.collection('posts').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return null;

    const post = doc.data();
    let likes = post.likes || [];

    if (likes.includes(userId)) {
      likes = likes.filter(id => id !== userId);
    } else {
      likes.push(userId);
    }

    await postRef.update({ likes });
    return likes;
  } catch (error) {
    console.error("Error toggling like:", error);
    return null;
  }
}

export async function addComment(postId, commentData) {
  try {
    const postRef = db.collection('posts').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return null;

    const post = doc.data();
    const comments = post.comments || [];

    const newComment = {
      id: Date.now().toString(),
      ...commentData,
      timestamp: new Date().toISOString()
    };

    comments.push(newComment);
    await postRef.update({ comments });
    return comments;
  } catch (error) {
    console.error("Error adding comment:", error);
    return null;
  }
}

export async function deletePost(postId) {
  try {
    await db.collection('posts').doc(postId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting post:", error);
    return false;
  }
}

// ==================== SALES MODULE ====================

export const updateLead = async (leadId, updateData) => {
  try {
    await db.collection('leads').doc(leadId).update(updateData);
    return { id: leadId, ...updateData };
  } catch (error) {
    console.error("Error updating lead:", error);
    return null;
  }
};

export const addTask = async (taskData) => {
  try {
    const res = await db.collection('tasks').add({
      ...taskData,
      createdAt: new Date().toISOString(),
      status: 'Pending'
    });
    return { id: res.id, ...taskData };
  } catch (error) {
    console.error("Error adding task:", error);
    return null;
  }
};

export const getTasks = async (companyId) => {
  try {
    const cid = parseInt(companyId);
    const snapshot = await db.collection('tasks')
      .where('companyId', '==', cid)
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
};

export const updateTaskStatus = async (taskId, status, notes = '') => {
  try {
    await db.collection('tasks').doc(taskId).update({ status, completionNotes: notes });
    return { id: taskId, status };
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
};

export const addRoutePoint = async (gpsData) => {
  try {
    const { userId, latitude, longitude, timestamp } = gpsData;
    const dateStr = timestamp.split('T')[0];

    // 1. Get last point to calculate distance
    const lastPointSnapshot = await db.collection('gps_routes')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    let dist = 0;
    if (!lastPointSnapshot.empty) {
      const lastPoint = lastPointSnapshot.docs[0].data();
      // Only calculate if points are on the same day to be safe
      if (lastPoint.timestamp.split('T')[0] === dateStr) {
        dist = calculateDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
      }
    }

    // 2. Add new point
    await db.collection('gps_routes').add(gpsData);

    // 3. Update Daily Stats (Distance)
    const statsId = `${userId}_${dateStr}`;
    const statsRef = db.collection('daily_stats').doc(statsId);
    const statsDoc = await statsRef.get();

    if (!statsDoc.exists) {
      await statsRef.set({
        userId,
        date: dateStr,
        totalDistance: dist,
        lastUpdated: timestamp
      });
    } else {
      const currentDist = statsDoc.data().totalDistance || 0;
      await statsRef.update({
        totalDistance: currentDist + dist,
        lastUpdated: timestamp
      });
    }

    return { status: 'success', addedDistance: dist };
  } catch (error) {
    console.error("Error logging GPS:", error);
    return null;
  }
};

export const getDailyStats = async (userId, dateStr) => {
  try {
    const statsId = `${userId}_${dateStr}`;
    const doc = await db.collection('daily_stats').doc(statsId).get();
    if (doc.exists) return doc.data();
    return { userId, date: dateStr, totalDistance: 0 };
  } catch (error) {
    console.error("Error getting daily stats:", error);
    return { userId, date: dateStr, totalDistance: 0 };
  }
};

export const getDailyRoute = async (userId, date) => {
  try {
    const snapshot = await db.collection('gps_routes')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'asc')
      .get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data());
  } catch (e) {
    console.error("Error fetching route", e);
    return [];
  }
};

// ==================== PROJECT MANAGEMENT ====================

// Add Project
export const addProject = async (projectData) => {
  try {
    // projectData: { title, description, companyId, deadline, createdBy, createdAt, status }
    const res = await db.collection('projects').add({
      ...projectData,
      status: 'Active',
      createdAt: new Date().toISOString()
    });
    return { id: res.id, ...projectData, status: 'Active' };
  } catch (error) {
    console.error("Error adding project:", error);
    return null;
  }
};

// Get Projects by Company
export const getProjects = async (companyId) => {
  try {
    const cid = parseInt(companyId);
    let snapshot = await db.collection('projects').where('companyId', '==', cid).get();

    // Fallback for string IDs if necessary, or just consistent usage
    if (snapshot.empty) {
      snapshot = await db.collection('projects').where('companyId', '==', String(companyId)).get();
    }

    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting projects:", error);
    return [];
  }
};

// Add Project Task
export const addProjectTask = async (taskData) => {
  try {
    // taskData: { projectId, projectTitle, title, description, assignedTo (empId), assignedToName, assignedBy, status, dueDate }
    const res = await db.collection('tasks').add({
      ...taskData,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      type: 'PROJECT_TASK' // Distinguish from Sales tasks if stored in same collection, or just metadata
    });
    return { id: res.id, ...taskData, status: 'Pending' };
  } catch (error) {
    console.error("Error adding project task:", error);
    return null;
  }
};

// Updated Task Progress (Employee)
export const updateTaskProgress = async (taskId, status) => {
  try {
    await db.collection('tasks').doc(taskId).update({ status });
    return { id: taskId, status };
  } catch (error) {
    console.error("Error updating task progress:", error);
    return null;
  }
};

// Get Tasks for User
export const getUserTasks = async (empId) => {
  try {
    const snapshot = await db.collection('tasks')
      .where('assignedTo', '==', empId)
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting user tasks:", error);
    return [];
  }
};

// Get Tasks for Project (For HR View)
export const getProjectTasks = async (projectId) => {
  try {
    const snapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting project tasks:", error);
    return [];
  }
}

// ==================== CHAT CLEANUP ====================

export const deleteAllMessages = async () => {
  try {
    const messagesRef = db.collection('messages');
    const snapshot = await messagesRef.get();

    if (snapshot.empty) {
      console.log('🧹 No messages to delete.');
      return true;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🧹 Deleted ${snapshot.size} messages.`);
    return true;
  } catch (error) {
    console.error('Error cleaning up messages:', error);
    return false;
  }
};

// ==================== FACE VERIFICATION ====================
export const saveFaceProfile = async (userId, profileImageBase64, faceDescriptor) => {
  try {
    const docRef = db.collection('users').doc(userId);
    await docRef.update({
      profileImage: profileImageBase64,
      faceDescriptor: faceDescriptor // array of numbers
    });
    return true;
  } catch (error) {
    console.error('Error saving face profile:', error);
    return false;
  }
};
