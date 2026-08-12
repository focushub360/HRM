import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaCamera, FaSave, FaTimes, FaEdit, FaUser, FaBuilding, FaMapMarkerAlt, FaEnvelope, FaPhone, FaIdCard, FaSignOutAlt, FaTrash, FaKey } from 'react-icons/fa';
import ChangePasswordModal from './common/ChangePasswordModal';
import SuccessModal from './common/SuccessModal';

const RenderField = ({ label, name, value, type = "text", disabled = false, onChange, isEditing, max }) => (
    <div className="mb-3 col-md-6">
        <label className="form-label text-muted small text-uppercase fw-bold">{label}</label>
        {isEditing && !disabled ? (
            <input
                type={type}
                className="form-control"
                name={name}
                value={value}
                onChange={onChange}
                max={max}
            />
        ) : (
            <div className="fw-medium border-bottom pb-1">{value || 'N/A'}</div>
        )}
    </div>
);

const Profile = () => {
    const { user, login, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

    // State for form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        gender: '',
        dob: '',
        address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
        },
        profileImage: null
    });

    const [previewImage, setPreviewImage] = useState(null);

    // Initialize data
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                gender: user.gender || 'Not Specified',
                dob: user.dob || '',
                address: {
                    street: user.address?.street || '',
                    city: user.address?.city || '',
                    state: user.address?.state || '',
                    postalCode: user.address?.postalCode || '',
                    country: user.address?.country || ''
                },
                profileImage: user.profileImage || null
            });
            setPreviewImage(user.profileImage || null);
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageChange = async (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setPreviewImage(URL.createObjectURL(file));
            setFormData(prev => ({ ...prev, newImageFile: file, deleteImage: false }));
        }
    };

    const handleDeleteImage = () => {
        if (window.confirm("Are you sure you want to remove your profile photo?")) {
            setPreviewImage(null);
            setFormData(prev => ({ ...prev, profileImage: null, newImageFile: null, deleteImage: true }));
        }
    };

    const [loadingText, setLoadingText] = useState("");
    const isProfileEditable = !(user?.role === 'admin' || user?.type === 'company' || user?.type === 'company_admin');

    // Helper: Compress Image to DataURL (Base64) - Resizing to 500x500 for speed
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500; // Smaller size for instant upload
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Return Base64 string directly
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (err) => reject(new Error("Image load failed"));
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSave = async () => {
        if (!isProfileEditable) {
            return;
        }
        setLoadingText("Saving...");
        try {
            let imageUrl = formData.profileImage;

            // 1. Process new image
            if (formData.newImageFile) {
                setLoadingText("Optimizing Image...");
                try {
                    // Compress to Base64 string (Tiny ~30-50KB)
                    const compressedBase64 = await compressImage(formData.newImageFile);

                    setLoadingText("Uploading...");

                    // Attempt Firebase Upload with Timeout
                    const uploadPromise = async () => {
                        const fileName = `profile_${user.id}_${Date.now()}.jpg`;
                        const storageRef = ref(storage, `profile_images/${fileName}`);
                        // Upload the Base64 string
                        const { uploadString } = await import('firebase/storage');
                        const snapshot = await uploadString(storageRef, compressedBase64, 'data_url');
                        return getDownloadURL(snapshot.ref);
                    };

                    // Race: Upload vs 5-second timeout
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Upload timed out")), 8000)
                    );

                    try {
                        imageUrl = await Promise.race([uploadPromise(), timeoutPromise]);
                        console.log("Uploaded to Firebase Storage:", imageUrl);
                    } catch (uploadError) {
                        console.warn("Storage upload failed/slow, using Base64 fallback:", uploadError);
                        // Fallback: Save the Base64 string directly to DB
                        // Since it's 500x500 compressed, it's safe for Firestore (~50KB)
                        imageUrl = compressedBase64;
                    }

                } catch (imgError) {
                    console.error("Image processing failed:", imgError);
                    alert("Failed to process image. Please try another file.");
                    setLoadingText("");
                    return;
                }
            } else if (formData.deleteImage) {
                imageUrl = null;
            }

            // 2. Prepare payload
            setLoadingText("Updating Profile...");
            const updatePayload = {
                name: formData.name,
                phone: formData.phone,
                gender: formData.gender,
                dob: formData.dob,
                address: formData.address,
                profileImage: imageUrl
            };

            // 3. Send to Backend
            let endpoint = "";
            let method = "PUT";

            if (user.type === 'hr') {
                endpoint = `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${user.companyId}/hr/${user.id}`;
            } else if (user.type === 'company' || user.role === 'admin') {
                endpoint = `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${user.companyId}/admin`;
            } else {
                endpoint = `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${user.companyId}/employees/${user.id}`;
            }

            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) throw new Error("Failed to update profile");

            const updatedUserFromBackend = await response.json();

            // 4. Update Local Context
            const newUserData = {
                ...user,
                ...updatedUserFromBackend,
                profileImage: imageUrl // Force update from local state/upload result
            };

            login(newUserData);
            setIsEditing(false);
            setSuccessModal({
                isOpen: true,
                title: 'Success!',
                message: 'Profile updated successfully!'
            });

        } catch (error) {
            console.error("Update failed:", error);
            alert("Failed to update profile. " + error.message);
        } finally {
            setLoadingText("");
        }
    };

    if (!user) return <div className="p-5 text-center">Loading Profile...</div>;

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">My Profile</h2>
                    <p className="text-muted">Manage your personal information</p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    {!isEditing ? (
                        <>
                            <button
                                className="btn btn-danger d-flex align-items-center gap-2 px-4 rounded-pill shadow-sm me-2"
                                onClick={() => logout()}
                            >
                                <FaSignOutAlt /> Sign Out
                            </button>
                            <button className="btn btn-warning me-2" onClick={() => setIsPasswordModalOpen(true)}>
                                <FaKey className="me-2" /> Change Password
                            </button>
                            {isProfileEditable && (
                                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                                    <FaEdit className="me-2" /> Edit Profile
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="d-flex gap-2">
                            <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setPreviewImage(user.profileImage); }}>
                                <FaTimes className="me-2" /> Cancel
                            </button>
                            <button className="btn btn-success" onClick={handleSave} disabled={!!loadingText}>
                                {loadingText ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        {loadingText}
                                    </>
                                ) : (
                                    <>
                                        <FaSave className="me-2" /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="row g-4">
                {/* Left Column: Photo & Core Identity */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 mb-4 h-100">
                        <div className="card-body text-center pt-5">
                            <div className="position-relative d-inline-block mb-4">
                                <div className="rounded-circle overflow-hidden border border-4 border-light shadow" style={{ width: '150px', height: '150px', backgroundColor: '#e9ecef' }}>
                                    {previewImage ? (
                                        <img src={previewImage} alt="Profile" className="w-100 h-100 object-fit-cover" />
                                    ) : (
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary display-1 fw-bold">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Edit & Delete Icons */}
                                {isEditing && isProfileEditable && (
                                    <div className="position-absolute bottom-0 start-50 translate-middle-x d-flex gap-2" style={{ marginBottom: '-15px' }}>
                                        <label className="btn btn-primary btn-sm rounded-circle shadow d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px', cursor: 'pointer' }} title="Change Photo">
                                            <FaCamera size={16} />
                                            <input type="file" className="d-none" accept="image/*" onChange={handleImageChange} />
                                        </label>

                                        {previewImage && (
                                            <button
                                                className="btn btn-danger btn-sm rounded-circle shadow d-flex align-items-center justify-content-center"
                                                style={{ width: '35px', height: '35px' }}
                                                onClick={handleDeleteImage}
                                                type="button"
                                                title="Remove Photo"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <h4 className="fw-bold mt-3">{user.name}</h4>
                            <p className="text-muted mb-1">{user.position || user.designation || 'Employee'}</p>
                            <span className="badge bg-primary text-uppercase px-3 py-2">{user.employeeType}</span>
                            {!isProfileEditable && <div className="mt-3 text-muted small">Admin profile is fixed.</div>}

                            <div className="mt-4 pt-3 border-top text-start">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="bg-light p-2 rounded me-3 text-primary"><FaEnvelope /></div>
                                    <div>
                                        <small className="text-muted d-block">Email Address</small>
                                        <span className="fw-medium">{user.email}</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="bg-light p-2 rounded me-3 text-primary"><FaPhone /></div>
                                    <div>
                                        <small className="text-muted d-block">Phone Number</small>
                                        <span className="fw-medium">{formData.phone || 'Not provided'}</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center">
                                    <div className="bg-light p-2 rounded me-3 text-primary"><FaIdCard /></div>
                                    <div>
                                        <small className="text-muted d-block">Employee ID</small>
                                        <span className="fw-medium">{user.empId}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Right Column: Detailed Forms */}
                <div className="col-lg-8">
                    {/* Personal & Employment Info */}
                    <div className="card shadow-sm border-0 mb-4">

                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold text-primary"><FaUser className="me-2" /> Personal & Employment Details</h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <RenderField label="Full Name" name="name" value={formData.name} onChange={handleChange} isEditing={isEditing} />
                                <RenderField label="Date of Birth" name="dob" value={formData.dob} type="date" onChange={handleChange} isEditing={isEditing} max={'9999-12-31'} />
                                <RenderField label="Gender" name="gender" value={formData.gender} onChange={handleChange} isEditing={isEditing} />
                                <RenderField label="Phone Number" name="phone" value={formData.phone} type="tel" onChange={handleChange} isEditing={isEditing} />
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-muted small text-uppercase fw-bold">Department</label>
                                    <div className="fw-medium border-bottom pb-1">{user.department || 'General'}</div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-muted small text-uppercase fw-bold">Joining Date</label>
                                    <div className="fw-medium border-bottom pb-1">{user.joiningDate || 'N/A'}</div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-muted small text-uppercase fw-bold">Salary (CTC)</label>
                                    <div className="fw-medium border-bottom pb-1 text-success fw-bold">{user.salary ? `â‚¹${user.salary}` : 'Confidential'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Info */}
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold text-primary"><FaMapMarkerAlt className="me-2" /> Address Information</h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <RenderField label="Street Address" name="address.street" value={formData.address.street} onChange={handleChange} isEditing={isEditing} />
                                <RenderField label="City" name="address.city" value={formData.address.city} onChange={handleChange} isEditing={isEditing} />
                                <RenderField label="State / Province" name="address.state" value={formData.address.state} onChange={handleChange} isEditing={isEditing} />
                                <RenderField label="Postal / Zip Code" name="address.postalCode" value={formData.address.postalCode} onChange={handleChange} isEditing={isEditing} />
                                <RenderField label="Country" name="address.country" value={formData.address.country} onChange={handleChange} isEditing={isEditing} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
                title={successModal.title}
                message={successModal.message}
            />
        </div>
    );
};

export default Profile;



