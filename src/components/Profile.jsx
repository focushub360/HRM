import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { storage } from '../firebase';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import {
    FaCamera, FaSave, FaTimes, FaEdit, FaUser, FaMapMarkerAlt, FaEnvelope,
    FaPhone, FaIdCard, FaSignOutAlt, FaTrash, FaKey, FaChevronDown,
    FaBriefcase, FaUserFriends, FaGraduationCap, FaPlus, FaLock, FaCheck
} from 'react-icons/fa';
import ChangePasswordModal from './common/ChangePasswordModal';
import SuccessModal from './common/SuccessModal';
import CustomDatePicker from './CustomDatePicker';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const WORK_MODE_OPTIONS = ['Office', 'Remote', 'Hybrid'];
const EMPLOYEE_TYPE_OPTIONS = ['Full Time', 'Part Time', 'Contract', 'Intern'];
const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'];

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');

const emptyEmergencyContact = () => ({
    id: `ec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '', relationship: '', primaryPhone: '', alternatePhone: '', email: '', address: ''
});

const emptyEducation = () => ({
    id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    qualification: '', degree: '', specialization: '', institution: '', yearOfPassing: '', percentage: ''
});

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Some backends store `shift` as a string ("General Shift"), others as a
 * time-range object ({ startTime, endTime }). Normalize either shape into a
 * plain display string so it's always safe to render / edit as text.
 */
const formatShiftValue = (shift) => {
    if (!shift) return '';
    if (typeof shift === 'string') return shift;
    if (typeof shift === 'object') {
        const { startTime, endTime, name, label } = shift;
        if (name) return name;
        if (label) return label;
        if (startTime || endTime) return `${startTime || ''}${startTime && endTime ? ' - ' : ''}${endTime || ''}`;
    }
    return '';
};

// ---------------------------------------------------------------------------
// Small presentational building blocks
// ---------------------------------------------------------------------------

/** Guards against rendering raw objects/arrays that sometimes leak in from
 *  inconsistent backend shapes (e.g. shift stored as {startTime,endTime}). */
const safeDisplay = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object') {
        if (value.name) return value.name;
        if (value.label) return value.label;
        if (value.startTime || value.endTime) return `${value.startTime || ''}${value.startTime && value.endTime ? ' - ' : ''}${value.endTime || ''}`;
        return JSON.stringify(value);
    }
    return String(value);
};

/** Text / phone / email input with a read-only display state */
const TextField = ({ label, value, onChange, isEditing, type = 'text', locked = false, placeholder, colSpan = 6 }) => {
    const displayValue = safeDisplay(value);
    const inputValue = (typeof value === 'string' || typeof value === 'number') ? value : '';
    return (
        <div className={`mb-3 col-md-${colSpan}`}>
            <label className="pf-label">
                {label}
                {locked && <FaLock size={10} className="ms-1 pf-lock-icon" title="Read-only" />}
            </label>
            {isEditing && !locked ? (
                <input
                    type={type}
                    className="pf-input"
                    value={inputValue}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <div className="pf-value">{displayValue || <span className="pf-empty">Not provided</span>}</div>
            )}
        </div>
    );
};

const SelectField = ({ label, value, onChange, isEditing, options, locked = false, colSpan = 6 }) => (
    <div className={`mb-3 col-md-${colSpan}`}>
        <label className="pf-label">
            {label}
            {locked && <FaLock size={10} className="ms-1 pf-lock-icon" title="Read-only" />}
        </label>
        {isEditing && !locked ? (
            <select className="pf-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select {label}</option>
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        ) : (
            <div className="pf-value">{value || <span className="pf-empty">Not provided</span>}</div>
        )}
    </div>
);

const DateField = ({ label, value, onChange, isEditing, locked = false, colSpan = 6, maxDate }) => (
    <div className={`mb-3 col-md-${colSpan}`}>
        <label className="pf-label">
            {label}
            {locked && <FaLock size={10} className="ms-1 pf-lock-icon" title="Read-only" />}
        </label>
        {isEditing && !locked ? (
            <CustomDatePicker value={value} onChange={onChange} maxDate={maxDate} />
        ) : (
            <div className="pf-value">
                {value ? formatDMY(value) : <span className="pf-empty">Not provided</span>}
            </div>
        )}
    </div>
);

function formatDMY(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}-${m}-${y}`;
}

/** Collapsible bar with its own inline Edit / Save / Cancel controls */
const AccordionSection = ({
    id, title, icon: Icon, isOpen, onToggle,
    isEditing, onEdit, onCancel, onSave, saving, children
}) => (
    <div className="pf-accordion-item">
        <button type="button" className="pf-accordion-header" onClick={onToggle} aria-expanded={isOpen}>
            <span className="pf-accordion-title">
                <span className="pf-accordion-icon"><Icon /></span>
                {title}
            </span>
            <span className="pf-accordion-header-right">
                {isEditing && <span className="pf-editing-pill">Editing</span>}
                <FaChevronDown className={`pf-chevron${isOpen ? ' pf-chevron-open' : ''}`} />
            </span>
        </button>

        <div className={`pf-accordion-collapse${isOpen ? ' pf-open' : ''}`}>
            <div className="pf-accordion-collapse-inner">
                <div className="pf-accordion-body">
                    <div className="pf-accordion-actions">
                        {!isEditing ? (
                            <button type="button" className="pf-btn pf-btn-ghost" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                <FaEdit className="me-1" size={13} /> Edit
                            </button>
                        ) : (
                            <div className="d-flex gap-2">
                                <button type="button" className="pf-btn pf-btn-outline" onClick={onCancel} disabled={saving}>
                                    <FaTimes className="me-1" size={13} /> Cancel
                                </button>
                                <button type="button" className="pf-btn pf-btn-solid" onClick={onSave} disabled={saving}>
                                    {saving ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    ) : (
                                        <FaSave className="me-1" size={13} />
                                    )}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="row">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Profile = () => {
    const { user, login, logout } = useAuth();

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

    const [openSection, setOpenSection] = useState('personal');
    const [editingSection, setEditingSection] = useState(null);
    const [savingSection, setSavingSection] = useState(null);
    const snapshotRef = useRef(null);

    const [formData, setFormData] = useState(() => buildInitialFormData(null));
    const [previewImage, setPreviewImage] = useState(null);
    const [newImageFile, setNewImageFile] = useState(null);
    const [deleteImageFlag, setDeleteImageFlag] = useState(false);
    const [photoSaving, setPhotoSaving] = useState(false);
    const fileInputRef = useRef(null);

    const isProfileEditable = !(user?.role === 'admin' || user?.type === 'company' || user?.type === 'company_admin');

    useEffect(() => {
        if (user) {
            setFormData(buildInitialFormData(user));
            setPreviewImage(user.profileImage || null);
        }
    }, [user]);

    function buildInitialFormData(u) {
        const nameParts = (u?.name || '').trim().split(/\s+/).filter(Boolean);
        return {
            personal: {
                firstName: u?.firstName || nameParts[0] || '',
                middleName: u?.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''),
                lastName: u?.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''),
                dob: u?.dob || '',
                gender: u?.gender || '',
                maritalStatus: u?.maritalStatus || '',
                bloodGroup: u?.bloodGroup || '',
                nationality: u?.nationality || '',
                personalEmail: u?.personalEmail || u?.email || '',
                personalPhone: u?.phone || ''
            },
            contact: {
                primaryPhone: u?.phone || '',
                alternatePhone: u?.alternatePhone || '',
                personalEmail: u?.personalEmail || u?.email || '',
                sameAsPermanent: !!u?.sameAsPermanent,
                currentAddress: {
                    line1: u?.address?.street || '',
                    city: u?.address?.city || '',
                    state: u?.address?.state || '',
                    country: u?.address?.country || '',
                    pincode: u?.address?.postalCode || ''
                },
                permanentAddress: {
                    line1: u?.permanentAddress?.street || '',
                    city: u?.permanentAddress?.city || '',
                    state: u?.permanentAddress?.state || '',
                    country: u?.permanentAddress?.country || '',
                    pincode: u?.permanentAddress?.postalCode || ''
                }
            },
            employment: {
                employeeId: u?.empId || '',
                employeeType: u?.employeeType || '',
                employmentStatus: u?.status || 'Active',
                doj: u?.joiningDate || '',
                department: u?.department || '',
                designation: u?.position || u?.designation || '',
                role: u?.role || '',
                reportingManager: u?.reportingManager || '',
                workLocation: u?.workLocation || '',
                branch: u?.branch || '',
                employmentLevel: u?.employmentLevel || '',
                shift: formatShiftValue(u?.shift),
                workMode: u?.workMode || ''
            },
            emergencyContacts: (u?.emergencyContacts && u.emergencyContacts.length > 0)
                ? deepClone(u.emergencyContacts)
                : [emptyEmergencyContact()],
            education: (u?.education && u.education.length > 0)
                ? deepClone(u.education)
                : [emptyEducation()]
        };
    }

    // ---- generic field setters --------------------------------------------
    const setField = (section, field, value) =>
        setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

    const setNestedField = (section, group, field, value) =>
        setFormData((prev) => ({
            ...prev,
            [section]: { ...prev[section], [group]: { ...prev[section][group], [field]: value } }
        }));

    const setArrayField = (section, index, field, value) =>
        setFormData((prev) => {
            const arr = [...prev[section]];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, [section]: arr };
        });

    const addArrayItem = (section, factory) =>
        setFormData((prev) => ({ ...prev, [section]: [...prev[section], factory()] }));

    const removeArrayItem = (section, index) =>
        setFormData((prev) => {
            const arr = prev[section].filter((_, i) => i !== index);
            return { ...prev, [section]: arr.length > 0 ? arr : prev[section] };
        });

    const toggleSameAsPermanent = (checked) => {
        setFormData((prev) => ({
            ...prev,
            contact: {
                ...prev.contact,
                sameAsPermanent: checked,
                currentAddress: checked ? deepClone(prev.contact.permanentAddress) : prev.contact.currentAddress
            }
        }));
    };

    // ---- accordion / edit lifecycle ---------------------------------------
    const handleToggleSection = (key) => {
        if (editingSection && editingSection !== key) return; // finish current edit first
        setOpenSection((prev) => (prev === key ? null : key));
    };

    const handleEdit = (key) => {
        snapshotRef.current = deepClone(formData[key]);
        setEditingSection(key);
        setOpenSection(key);
    };

    const handleCancel = (key) => {
        if (snapshotRef.current) {
            setFormData((prev) => ({ ...prev, [key]: snapshotRef.current }));
        }
        setEditingSection(null);
        snapshotRef.current = null;
    };

    const buildEndpoint = () => {
        if (!user) return '';
        if (user.type === 'hr') return `${API_BASE}/companies/${user.companyId}/hr/${user.id}`;
        if (user.type === 'company' || user.role === 'admin') return `${API_BASE}/companies/${user.companyId}/admin`;
        return `${API_BASE}/companies/${user.companyId}/employees/${user.id}`;
    };

    const persist = async (extraPayload = {}) => {
        const endpoint = buildEndpoint();
        const payload = {
            name: [formData.personal.firstName, formData.personal.middleName, formData.personal.lastName].filter(Boolean).join(' '),
            firstName: formData.personal.firstName,
            middleName: formData.personal.middleName,
            lastName: formData.personal.lastName,
            dob: formData.personal.dob,
            gender: formData.personal.gender,
            maritalStatus: formData.personal.maritalStatus,
            bloodGroup: formData.personal.bloodGroup,
            nationality: formData.personal.nationality,
            personalEmail: formData.personal.personalEmail,
            phone: formData.contact.primaryPhone,
            alternatePhone: formData.contact.alternatePhone,
            sameAsPermanent: formData.contact.sameAsPermanent,
            address: {
                street: formData.contact.currentAddress.line1,
                city: formData.contact.currentAddress.city,
                state: formData.contact.currentAddress.state,
                country: formData.contact.currentAddress.country,
                postalCode: formData.contact.currentAddress.pincode
            },
            permanentAddress: {
                street: formData.contact.permanentAddress.line1,
                city: formData.contact.permanentAddress.city,
                state: formData.contact.permanentAddress.state,
                country: formData.contact.permanentAddress.country,
                postalCode: formData.contact.permanentAddress.pincode
            },
            employeeType: formData.employment.employeeType,
            workLocation: formData.employment.workLocation,
            branch: formData.employment.branch,
            employmentLevel: formData.employment.employmentLevel,
            shift: formData.employment.shift,
            workMode: formData.employment.workMode,
            emergencyContacts: formData.emergencyContacts,
            education: formData.education,
            ...extraPayload
        };

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update profile');
        const updated = await response.json().catch(() => ({}));
        login({ ...user, ...updated, ...payload, profileImage: extraPayload.profileImage !== undefined ? extraPayload.profileImage : user.profileImage });
    };

    const handleSaveSection = async (key, label) => {
        setSavingSection(key);
        try {
            await persist();
            setEditingSection(null);
            snapshotRef.current = null;
            setSuccessModal({ isOpen: true, title: 'Saved!', message: `${label} updated successfully.` });
        } catch (err) {
            console.error(err);
            alert('Failed to save changes. ' + err.message);
        } finally {
            setSavingSection(null);
        }
    };

    // ---- photo handling (kept consistent with the app's shared upload UX) -
    const compressImage = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 500;
                let { width, height } = img;
                if (width > height) {
                    if (width > MAX) { height *= MAX / width; width = MAX; }
                } else if (height > MAX) { width *= MAX / height; height = MAX; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject(new Error('Image load failed'));
        };
        reader.onerror = reject;
    });

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPreviewImage(URL.createObjectURL(file));
        setNewImageFile(file);
        setDeleteImageFlag(false);
    };

    const handleDeleteImage = () => {
        if (!window.confirm('Remove your profile photo?')) return;
        setPreviewImage(null);
        setNewImageFile(null);
        setDeleteImageFlag(true);
    };

    const handleCancelPhoto = () => {
        setPreviewImage(user?.profileImage || null);
        setNewImageFile(null);
        setDeleteImageFlag(false);
    };

    const handleSavePhoto = async () => {
        setPhotoSaving(true);
        try {
            let imageUrl = user?.profileImage || null;
            if (newImageFile) {
                const compressed = await compressImage(newImageFile);
                try {
                    const fileName = `profile_${user.id}_${Date.now()}.jpg`;
                    const ref = storageRef(storage, `profile_images/${fileName}`);
                    const { uploadString } = await import('firebase/storage');
                    const uploadPromise = uploadString(ref, compressed, 'data_url').then((s) => getDownloadURL(s.ref));
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
                    imageUrl = await Promise.race([uploadPromise, timeoutPromise]);
                } catch (err) {
                    console.warn('Storage upload failed, using compressed fallback', err);
                    imageUrl = compressed;
                }
            } else if (deleteImageFlag) {
                imageUrl = null;
            }
            await persist({ profileImage: imageUrl });
            setNewImageFile(null);
            setDeleteImageFlag(false);
            setSuccessModal({ isOpen: true, title: 'Saved!', message: 'Profile photo updated.' });
        } catch (err) {
            console.error(err);
            alert('Failed to update photo. ' + err.message);
        } finally {
            setPhotoSaving(false);
        }
    };

    const photoDirty = !!newImageFile || deleteImageFlag;

    if (!user) return <div className="p-5 text-center">Loading Profile...</div>;

    const fullName = [formData.personal.firstName, formData.personal.middleName, formData.personal.lastName].filter(Boolean).join(' ') || user.name;

    const sections = [
        { key: 'personal', title: 'Personal Information', icon: FaUser },
        { key: 'contact', title: 'Contact Information', icon: FaMapMarkerAlt },
        { key: 'employment', title: 'Employment Information', icon: FaBriefcase },
        { key: 'emergency', title: 'Emergency Contact', icon: FaUserFriends },
        { key: 'education', title: 'Education Details', icon: FaGraduationCap }
    ];

    return (
        <div className="pf-page">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div>
                    <h2 className="pf-page-title">My Profile</h2>
                    <p className="pf-page-subtitle">Manage your personal information</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="pf-btn pf-btn-outline" onClick={() => setIsPasswordModalOpen(true)}>
                        <FaKey className="me-2" /> Change Password
                    </button>
                    <button className="pf-btn pf-btn-danger" onClick={() => logout()}>
                        <FaSignOutAlt className="me-2" /> Sign Out
                    </button>
                </div>
            </div>

            {/* Identity card */}
            <div className="pf-card pf-identity-card mb-4">
                <div className="pf-identity-photo-wrap">
                    <div className="pf-avatar">
                        {previewImage ? (
                            <img src={previewImage} alt="Profile" />
                        ) : (
                            <span>{fullName?.charAt(0)?.toUpperCase() || '?'}</span>
                        )}
                    </div>
                    {isProfileEditable && (
                        <div className="pf-avatar-actions">
                            <label className="pf-avatar-btn" title="Change photo">
                                <FaCamera size={14} />
                                <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleImageChange} />
                            </label>
                            {previewImage && (
                                <button type="button" className="pf-avatar-btn pf-avatar-btn-danger" title="Remove photo" onClick={handleDeleteImage}>
                                    <FaTrash size={12} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="pf-identity-info">
                    <h3 className="pf-identity-name">{fullName}</h3>
                    <div className="pf-identity-meta">
                        <span className="pf-chip"><FaIdCard size={12} className="me-1" /> {formData.employment.employeeId || 'N/A'}</span>
                        <span className="pf-chip">{formData.employment.designation || 'Employee'}</span>
                        <span className="pf-chip pf-chip-accent">{formData.employment.department || 'General'}</span>
                    </div>
                </div>

                {photoDirty && (
                    <div className="pf-photo-save-bar">
                        <button type="button" className="pf-btn pf-btn-outline" onClick={handleCancelPhoto} disabled={photoSaving}>
                            <FaTimes className="me-1" size={12} /> Cancel
                        </button>
                        <button type="button" className="pf-btn pf-btn-solid" onClick={handleSavePhoto} disabled={photoSaving}>
                            {photoSaving ? <span className="spinner-border spinner-border-sm me-2" /> : <FaCheck className="me-1" size={12} />}
                            {photoSaving ? 'Saving...' : 'Save Photo'}
                        </button>
                    </div>
                )}
            </div>

            {/* Accordion sections */}
            <div className="pf-accordion">
                {sections.map(({ key, title, icon }) => (
                    <AccordionSection
                        key={key}
                        id={key}
                        title={title}
                        icon={icon}
                        isOpen={openSection === key}
                        onToggle={() => handleToggleSection(key)}
                        isEditing={editingSection === key}
                        onEdit={() => handleEdit(key)}
                        onCancel={() => handleCancel(key)}
                        onSave={() => handleSaveSection(key, title)}
                        saving={savingSection === key}
                    >
                        {key === 'personal' && (
                            <PersonalFields data={formData.personal} isEditing={editingSection === 'personal'}
                                setField={(f, v) => setField('personal', f, v)} />
                        )}
                        {key === 'contact' && (
                            <ContactFields data={formData.contact} isEditing={editingSection === 'contact'}
                                setField={(f, v) => setField('contact', f, v)}
                                setNestedField={(g, f, v) => setNestedField('contact', g, f, v)}
                                toggleSameAsPermanent={toggleSameAsPermanent} />
                        )}
                        {key === 'employment' && (
                            <EmploymentFields data={formData.employment} isEditing={editingSection === 'employment'}
                                setField={(f, v) => setField('employment', f, v)} />
                        )}
                        {key === 'emergency' && (
                            <EmergencyFields list={formData.emergencyContacts} isEditing={editingSection === 'emergency'}
                                setArrayField={(i, f, v) => setArrayField('emergencyContacts', i, f, v)}
                                addItem={() => addArrayItem('emergencyContacts', emptyEmergencyContact)}
                                removeItem={(i) => removeArrayItem('emergencyContacts', i)} />
                        )}
                        {key === 'education' && (
                            <EducationFields list={formData.education} isEditing={editingSection === 'education'}
                                setArrayField={(i, f, v) => setArrayField('education', i, f, v)}
                                addItem={() => addArrayItem('education', emptyEducation)}
                                removeItem={(i) => removeArrayItem('education', i)} />
                        )}
                    </AccordionSection>
                ))}
            </div>

            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
                title={successModal.title}
                message={successModal.message}
            />

            <style>{`
                .pf-page {
                    padding: 1.5rem;
                    min-height: 100vh;
                    background: var(--bg-main, #f5f6f8);
                    color: var(--text-main, #212529);
                }
                .pf-page-title { font-weight: 700; margin-bottom: 2px; color: var(--text-main, #212529); }
                .pf-page-subtitle { color: var(--text-muted, #6c757d); margin: 0; }

                .pf-card {
                    background: var(--card-bg, #fff);
                    border: 1px solid var(--border-color, #e9ecef);
                    border-radius: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }

                /* ---- Identity card ---- */
                .pf-identity-card {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    flex-wrap: wrap;
                    position: relative;
                }
                .pf-identity-photo-wrap { position: relative; flex-shrink: 0; }
                .pf-avatar {
                    width: 96px;
                    height: 96px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--accent-soft, rgba(13,110,253,0.15));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.2rem;
                    font-weight: 700;
                    color: var(--accent, #0d6efd);
                    border: 3px solid var(--card-bg, #fff);
                    box-shadow: 0 0 0 1px var(--border-color, #e9ecef);
                }
                .pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .pf-avatar-actions {
                    position: absolute;
                    bottom: -4px;
                    right: -4px;
                    display: flex;
                    gap: 4px;
                }
                .pf-avatar-btn {
                    width: 30px; height: 30px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%;
                    background: var(--accent, #0d6efd);
                    color: #fff;
                    cursor: pointer;
                    border: 2px solid var(--card-bg, #fff);
                    transition: transform 120ms ease;
                }
                .pf-avatar-btn:hover { transform: scale(1.08); }
                .pf-avatar-btn-danger { background: #dc3545; }

                .pf-identity-info { flex: 1; min-width: 200px; }
                .pf-identity-name { font-weight: 700; margin-bottom: 8px; color: var(--text-main, #212529); }
                .pf-identity-meta { display: flex; gap: 8px; flex-wrap: wrap; }
                .pf-chip {
                    display: inline-flex; align-items: center;
                    background: var(--surface-soft, #f1f3f5);
                    color: var(--text-main, #212529);
                    padding: 4px 12px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                .pf-chip-accent { background: var(--accent-soft, rgba(13,110,253,0.15)); color: var(--accent, #0d6efd); font-weight: 700; }

                .pf-photo-save-bar {
                    display: flex;
                    gap: 8px;
                    width: 100%;
                    justify-content: flex-end;
                    padding-top: 1rem;
                    border-top: 1px dashed var(--border-color, #e9ecef);
                    animation: pf-fade-in 160ms ease;
                }

                /* ---- Accordion ---- */
                .pf-accordion { display: flex; flex-direction: column; gap: 12px; }
                .pf-accordion-item {
                    background: var(--card-bg, #fff);
                    border: 1px solid var(--border-color, #e9ecef);
                    border-radius: 14px;
                    overflow: hidden;
                }
                .pf-accordion-header {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.25rem;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                }
                .pf-accordion-header:hover { background: var(--surface-soft, #f8f9fa); }
                .pf-accordion-title {
                    display: flex; align-items: center; gap: 10px;
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--text-main, #212529);
                }
                .pf-accordion-icon {
                    width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--accent-soft, rgba(13,110,253,0.15));
                    color: var(--accent, #0d6efd);
                    border-radius: 9px;
                }
                .pf-accordion-header-right { display: flex; align-items: center; gap: 10px; }
                .pf-editing-pill {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    background: var(--accent-soft, rgba(13,110,253,0.15));
                    color: var(--accent, #0d6efd);
                    padding: 3px 10px;
                    border-radius: 999px;
                }
                .pf-chevron { color: var(--text-muted, #6c757d); transition: transform 220ms ease; }
                .pf-chevron-open { transform: rotate(180deg); }

                .pf-accordion-collapse {
                    display: grid;
                    grid-template-rows: 0fr;
                    transition: grid-template-rows 260ms ease;
                }
                .pf-accordion-collapse.pf-open { grid-template-rows: 1fr; }
                .pf-accordion-collapse-inner { overflow: hidden; }
                .pf-accordion-body {
                    padding: 0.25rem 1.25rem 1.25rem;
                    border-top: 1px solid var(--border-color, #eef0f2);
                }
                .pf-accordion-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding: 1rem 0 0.5rem;
                }

                /* ---- Fields ---- */
                .pf-label {
                    display: block;
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: var(--text-muted, #6c757d);
                    margin-bottom: 6px;
                }
                .pf-lock-icon { color: var(--text-muted, #adb5bd); vertical-align: middle; }
                .pf-value {
                    font-weight: 500;
                    color: var(--text-main, #212529);
                    padding-bottom: 6px;
                    border-bottom: 1px solid var(--border-color, #eef0f2);
                    min-height: 1.6em;
                }
                .pf-empty { color: var(--text-muted, #adb5bd); font-weight: 400; font-style: italic; }
                .pf-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid var(--border-color, #ced4da);
                    background: var(--input-bg, #fff);
                    color: var(--text-main, #212529);
                    font-size: 0.95rem;
                    transition: border-color 150ms ease, box-shadow 150ms ease;
                }
                .pf-input:focus {
                    outline: none;
                    border-color: var(--accent, #0d6efd);
                    box-shadow: 0 0 0 3px var(--accent-soft, rgba(13,110,253,0.15));
                }
                .pf-input:disabled { background: var(--surface-soft, #f1f3f5); cursor: not-allowed; }

                .pf-subheading {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--accent, #0d6efd);
                    margin: 0.5rem 0 0.75rem;
                    padding-top: 0.5rem;
                    border-top: 1px dashed var(--border-color, #e9ecef);
                }
                .pf-subheading:first-child { border-top: none; padding-top: 0; }

                .pf-checkbox-row {
                    display: flex; align-items: center; gap: 8px;
                    margin-bottom: 1rem;
                    font-size: 0.85rem;
                    color: var(--text-main, #212529);
                }

                /* ---- Repeatable cards (emergency contacts / education) ---- */
                .pf-repeat-card {
                    background: var(--surface-soft, #f8f9fa);
                    border: 1px solid var(--border-color, #eef0f2);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    width: 100%;
                }
                .pf-repeat-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .pf-repeat-card-title { font-weight: 700; font-size: 0.85rem; color: var(--text-main, #212529); }
                .pf-remove-btn {
                    border: none; background: transparent; color: #dc3545;
                    font-size: 0.78rem; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; gap: 4px;
                }
                .pf-remove-btn:hover { text-decoration: underline; }
                .pf-add-btn {
                    border: 1px dashed var(--accent, #0d6efd);
                    background: transparent;
                    color: var(--accent, #0d6efd);
                    border-radius: 10px;
                    padding: 0.6rem;
                    width: 100%;
                    font-weight: 600;
                    font-size: 0.85rem;
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    cursor: pointer;
                    transition: background 120ms ease;
                }
                .pf-add-btn:hover { background: var(--accent-soft, rgba(13,110,253,0.15)); }

                .pf-education-view {
                    display: flex;
                    flex-direction: column;
                    padding: 0.9rem 1rem;
                    background: var(--surface-soft, #f8f9fa);
                    border-radius: 12px;
                    margin-bottom: 0.75rem;
                    border-left: 3px solid var(--accent, #0d6efd);
                }
                .pf-education-view strong { color: var(--text-main, #212529); }
                .pf-education-view span { color: var(--text-muted, #6c757d); font-size: 0.85rem; }

                /* ---- Buttons ---- */
                .pf-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    border-radius: 999px;
                    padding: 0.5rem 1.1rem;
                    font-weight: 600;
                    font-size: 0.85rem;
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
                }
                .pf-btn:active { transform: scale(0.97); }
                .pf-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .pf-btn-solid { background: var(--accent, #0d6efd); color: #fff; }
                .pf-btn-solid:hover:not(:disabled) { box-shadow: 0 4px 12px var(--accent-soft, rgba(13,110,253,0.35)); }
                .pf-btn-outline { background: transparent; color: var(--text-main, #212529); border-color: var(--border-color, #ced4da); }
                .pf-btn-outline:hover:not(:disabled) { background: var(--surface-soft, #f1f3f5); }
                .pf-btn-ghost { background: var(--accent-soft, rgba(13,110,253,0.15)); color: var(--accent, #0d6efd); }
                .pf-btn-ghost:hover { background: var(--accent-soft, rgba(13,110,253,0.28)); }
                .pf-btn-danger { background: #dc3545; color: #fff; }
                .pf-btn-danger:hover { box-shadow: 0 4px 12px rgba(220,53,69,0.35); }

                @keyframes pf-fade-in {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 576px) {
                    .pf-identity-card { flex-direction: column; text-align: center; }
                    .pf-identity-meta { justify-content: center; }
                    .pf-accordion-header { padding: 0.85rem 1rem; }
                }
            `}</style>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Section field groups
// ---------------------------------------------------------------------------

const PersonalFields = ({ data, isEditing, setField }) => (
    <>
        <TextField label="First Name" value={data.firstName} isEditing={isEditing} onChange={(v) => setField('firstName', v)} />
        <TextField label="Middle Name" value={data.middleName} isEditing={isEditing} onChange={(v) => setField('middleName', v)} />
        <TextField label="Last Name" value={data.lastName} isEditing={isEditing} onChange={(v) => setField('lastName', v)} />
        <DateField label="Date of Birth" value={data.dob} isEditing={isEditing} onChange={(v) => setField('dob', v)} maxDate={new Date()} />
        <SelectField label="Gender" value={data.gender} isEditing={isEditing} onChange={(v) => setField('gender', v)} options={GENDER_OPTIONS} />
        <SelectField label="Marital Status" value={data.maritalStatus} isEditing={isEditing} onChange={(v) => setField('maritalStatus', v)} options={MARITAL_OPTIONS} />
        <SelectField label="Blood Group" value={data.bloodGroup} isEditing={isEditing} onChange={(v) => setField('bloodGroup', v)} options={BLOOD_GROUPS} />
        <TextField label="Nationality" value={data.nationality} isEditing={isEditing} onChange={(v) => setField('nationality', v)} />
        <TextField label="Personal Email" type="email" value={data.personalEmail} isEditing={isEditing} onChange={(v) => setField('personalEmail', v)} />
        <TextField label="Personal Phone" type="tel" value={data.personalPhone} isEditing={isEditing} onChange={(v) => setField('personalPhone', v)} />
    </>
);

const AddressBlock = ({ label, address, isEditing, onChange, disabled }) => (
    <>
        <div className="pf-subheading col-12">{label}</div>
        <TextField label="Address Line" value={address.line1} isEditing={isEditing && !disabled} onChange={(v) => onChange('line1', v)} locked={disabled} colSpan={12} />
        <TextField label="City" value={address.city} isEditing={isEditing && !disabled} onChange={(v) => onChange('city', v)} locked={disabled} colSpan={3} />
        <TextField label="State" value={address.state} isEditing={isEditing && !disabled} onChange={(v) => onChange('state', v)} locked={disabled} colSpan={3} />
        <TextField label="Country" value={address.country} isEditing={isEditing && !disabled} onChange={(v) => onChange('country', v)} locked={disabled} colSpan={3} />
        <TextField label="PIN Code" value={address.pincode} isEditing={isEditing && !disabled} onChange={(v) => onChange('pincode', v)} locked={disabled} colSpan={3} />
    </>
);

const ContactFields = ({ data, isEditing, setField, setNestedField, toggleSameAsPermanent }) => (
    <>
        <TextField label="Primary Phone" type="tel" value={data.primaryPhone} isEditing={isEditing} onChange={(v) => setField('primaryPhone', v)} />
        <TextField label="Alternate Phone" type="tel" value={data.alternatePhone} isEditing={isEditing} onChange={(v) => setField('alternatePhone', v)} />
        <TextField label="Personal Email" type="email" value={data.personalEmail} isEditing={isEditing} onChange={(v) => setField('personalEmail', v)} colSpan={12} />

        <AddressBlock
            label="Permanent Address"
            address={data.permanentAddress}
            isEditing={isEditing}
            onChange={(f, v) => setNestedField('permanentAddress', f, v)}
        />

        <div className="col-12">
            <label className="pf-checkbox-row">
                <input
                    type="checkbox"
                    checked={data.sameAsPermanent}
                    disabled={!isEditing}
                    onChange={(e) => toggleSameAsPermanent(e.target.checked)}
                />
                Current address is the same as permanent address
            </label>
        </div>

        <AddressBlock
            label="Current Address"
            address={data.currentAddress}
            isEditing={isEditing}
            onChange={(f, v) => setNestedField('currentAddress', f, v)}
            disabled={data.sameAsPermanent}
        />
    </>
);

const EmploymentFields = ({ data, isEditing, setField }) => (
    <>
        <TextField label="Employee ID" value={data.employeeId} isEditing={isEditing} locked onChange={() => {}} />
        <SelectField label="Employee Type" value={data.employeeType} isEditing={isEditing} onChange={(v) => setField('employeeType', v)} options={EMPLOYEE_TYPE_OPTIONS} />
        <TextField label="Employment Status" value={data.employmentStatus} isEditing={isEditing} locked onChange={() => {}} />
        <DateField label="Date of Joining" value={data.doj} isEditing={isEditing} locked onChange={() => {}} />
        <TextField label="Department" value={data.department} isEditing={isEditing} locked onChange={() => {}} />
        <TextField label="Designation" value={data.designation} isEditing={isEditing} locked onChange={() => {}} />
        <TextField label="Role" value={data.role} isEditing={isEditing} onChange={(v) => setField('role', v)} />
        <TextField label="Reporting Manager" value={data.reportingManager} isEditing={isEditing} locked onChange={() => {}} />
        <TextField label="Work Location" value={data.workLocation} isEditing={isEditing} onChange={(v) => setField('workLocation', v)} />
        <TextField label="Branch" value={data.branch} isEditing={isEditing} onChange={(v) => setField('branch', v)} />
        <TextField label="Employment Level" value={data.employmentLevel} isEditing={isEditing} onChange={(v) => setField('employmentLevel', v)} />
        <TextField label="Shift" value={data.shift} isEditing={isEditing} onChange={(v) => setField('shift', v)} />
        <SelectField label="Work Mode" value={data.workMode} isEditing={isEditing} onChange={(v) => setField('workMode', v)} options={WORK_MODE_OPTIONS} />
    </>
);

const EmergencyFields = ({ list, isEditing, setArrayField, addItem, removeItem }) => (
    <div className="col-12">
        {list.map((contact, idx) => (
            <div className="pf-repeat-card" key={contact.id || idx}>
                <div className="pf-repeat-card-header">
                    <span className="pf-repeat-card-title">Emergency Contact {idx + 1}</span>
                    {isEditing && list.length > 1 && (
                        <button type="button" className="pf-remove-btn" onClick={() => removeItem(idx)}>
                            <FaTrash size={11} /> Remove
                        </button>
                    )}
                </div>
                <div className="row">
                    <TextField label="Contact Name" value={contact.name} isEditing={isEditing} onChange={(v) => setArrayField(idx, 'name', v)} />
                    <SelectField label="Relationship" value={contact.relationship} isEditing={isEditing} onChange={(v) => setArrayField(idx, 'relationship', v)} options={RELATIONSHIP_OPTIONS} />
                    <TextField label="Primary Phone" type="tel" value={contact.primaryPhone} isEditing={isEditing} onChange={(v) => setArrayField(idx, 'primaryPhone', v)} />
                    <TextField label="Alternate Phone" type="tel" value={contact.alternatePhone} isEditing={isEditing} onChange={(v) => setArrayField(idx, 'alternatePhone', v)} />
                    <TextField label="Email" type="email" value={contact.email} isEditing={isEditing} onChange={(v) => setArrayField(idx, 'email', v)} />
                    <TextField label="Address" value={contact.address} isEditing={isEditing} onChange={(v) => setArrayField(idx, 'address', v)} />
                </div>
            </div>
        ))}
        {isEditing && (
            <button type="button" className="pf-add-btn" onClick={addItem}>
                <FaPlus size={12} /> Add Emergency Contact
            </button>
        )}
    </div>
);

const EducationFields = ({ list, isEditing, setArrayField, addItem, removeItem }) => (
    <div className="col-12">
        {list.map((edu, idx) =>
            isEditing ? (
                <div className="pf-repeat-card" key={edu.id || idx}>
                    <div className="pf-repeat-card-header">
                        <span className="pf-repeat-card-title">Qualification {idx + 1}</span>
                        {list.length > 1 && (
                            <button type="button" className="pf-remove-btn" onClick={() => removeItem(idx)}>
                                <FaTrash size={11} /> Remove
                            </button>
                        )}
                    </div>
                    <div className="row">
                        <TextField label="Highest Qualification" value={edu.qualification} isEditing onChange={(v) => setArrayField(idx, 'qualification', v)} />
                        <TextField label="Degree" value={edu.degree} isEditing onChange={(v) => setArrayField(idx, 'degree', v)} />
                        <TextField label="Specialization" value={edu.specialization} isEditing onChange={(v) => setArrayField(idx, 'specialization', v)} />
                        <TextField label="Institution" value={edu.institution} isEditing onChange={(v) => setArrayField(idx, 'institution', v)} />
                        <TextField label="Year of Passing" value={edu.yearOfPassing} isEditing onChange={(v) => setArrayField(idx, 'yearOfPassing', v)} colSpan={3} />
                        <TextField label="Percentage / CGPA" value={edu.percentage} isEditing onChange={(v) => setArrayField(idx, 'percentage', v)} colSpan={3} />
                    </div>
                </div>
            ) : (
                <div className="pf-education-view" key={edu.id || idx}>
                    <strong>{edu.qualification || 'Qualification not set'}{edu.specialization ? ` – ${edu.specialization}` : ''}</strong>
                    <span>{edu.degree}{edu.degree && edu.institution ? ' · ' : ''}{edu.institution}</span>
                    <span>{edu.yearOfPassing}{edu.yearOfPassing && edu.percentage ? ' · ' : ''}{edu.percentage ? `CGPA/% : ${edu.percentage}` : ''}</span>
                </div>
            )
        )}
        {isEditing && (
            <button type="button" className="pf-add-btn" onClick={addItem}>
                <FaPlus size={12} /> Add Education
            </button>
        )}
    </div>
);

export default Profile;