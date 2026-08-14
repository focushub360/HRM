import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import "./EmployeeForm.css";

const AddEmployee = () => {
  const { companies, addEmployeeToCompany, user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [availableHRs, setAvailableHRs] = useState([]);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",

    // Address Information
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",

    // Employment Details
    employeeId: "",
    department: "",
    position: "",
    employmentType: "full-time",
    joiningDate: "",
    salary: "",
    reportingManager: "", // Will store HR ID or Name
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",

    // Education
    highestQualification: "",
    university: "",
    graduationYear: "",

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
  });

  const [certificates, setCertificates] = useState([]);
  const [certificateInput, setCertificateInput] = useState({
    name: "",
    file: null,
  });

  // Aadhar State
  const [aadharFile, setAadharFile] = useState(null);
  const [aadharBase64, setAadharBase64] = useState("");

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is Company Admin/HR, auto-select their company
  useEffect(() => {
    if (user?.companyId) {
      setSelectedCompany(user.companyId);
    }
  }, [user]);

  // Update Available HRs when Company Changes
  useEffect(() => {
    if (selectedCompany) {
      const company = companies.find(c => c.id === parseInt(selectedCompany));
      if (company && company.hrAccounts) {
        setAvailableHRs(company.hrAccounts);
      } else {
        setAvailableHRs([]);
      }
    } else {
      setAvailableHRs([]);
    }
  }, [selectedCompany, companies]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleAadharFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAadharFile(file);
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setAadharBase64(reader.result);
      };
      reader.readAsDataURL(file);

      if (errors.aadhar) {
        setErrors(prev => ({ ...prev, aadhar: "" }));
      }
    }
  };

  const handleCertificateFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCertificateInput((prev) => ({
        ...prev,
        file: file,
      }));
    }
  };

  const handleAddCertificate = () => {
    if (!certificateInput.name || !certificateInput.file) {
      alert("Please enter certificate name and select a file");
      return;
    }

    const newCertificate = {
      id: Date.now(),
      name: certificateInput.name,
      fileName: certificateInput.file.name,
      fileSize: (certificateInput.file.size / 1024).toFixed(2),
      uploadDate: new Date().toLocaleDateString(),
    };

    setCertificates((prev) => [...prev, newCertificate]);
    setCertificateInput({ name: "", file: null });
    document.getElementById("certificateFile").value = "";
  };

  const handleRemoveCertificate = (id) => {
    setCertificates((prev) => prev.filter((cert) => cert.id !== id));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedCompany) newErrors.company = "Company is required";
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password?.trim()) newErrors.password = "Password is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.position) newErrors.position = "Position is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to top to see errors
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);

    const employeeData = {
      name: `${formData.firstName} ${formData.lastName}`,
      ...formData,
      certificates: certificates, // Note: Files aren't actually uploaded in this demo, just metadata
      aadharDoc: aadharBase64, // Storing Base64 in Firestore (Not recommended for Prod, but meets "store in db" req securely enough for demo)
      assignedCompanyId: selectedCompany,
      status: 'Active',
      registeredDate: new Date().toISOString(),
      shift: {
        startTime: formData.shiftStartTime || "09:00",
        endTime: formData.shiftEndTime || "18:00"
      },
      // Creating standard user fields for login
      employeeType: formData.department === 'sales' ? 'sales' : 'office', // Simple logic
      role: formData.role || 'employee',
      password: formData.password, // Use entered password
      // Capture Head HR (Creator) Details
      headHrId: user?.id,
      headHrName: user?.name,
      headHrEmail: user?.email
    };

    console.log("Submitting Employee Data...", employeeData);

    const result = await addEmployeeToCompany(selectedCompany, employeeData);

    setIsSubmitting(false);

    if (result && result.error) {
      alert(result.error);
    } else if (result && result.employeeAccount) {
      alert("Employee added successfully!");
      setSubmitted(true);
      // Reset form
      setFormData({
        firstName: "", lastName: "", email: "", password: "", phone: "", dateOfBirth: "",
        gender: "", nationality: "", street: "", city: "", state: "",
        postalCode: "", country: "", employeeId: "", department: "",
        position: "", employmentType: "full-time", role: "employee", joiningDate: "", salary: "",
        reportingManager: "", highestQualification: "", university: "",
        graduationYear: "", emergencyContactName: "", emergencyContactPhone: "",
        emergencyContactRelation: "", shiftStartTime: "09:00", shiftEndTime: "18:00"
      });
      setCertificates([]);
      setAadharFile(null);
      setAadharBase64("");
      if (!user?.companyId) setSelectedCompany(""); // Reset company if super admin
      setTimeout(() => setSubmitted(false), 3000);
    } else {
      alert("Failed to add employee. Please try again.");
    }
  };

  return (
    <div className="add-employee-container w-100">
      {submitted && (
        <div className="alert alert-success alert-dismissible fade show m-3" role="alert">
          <strong>Success!</strong> Employee information has been saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="employee-form w-100">
        <div className="form-sections-wrapper">
          {/* Company Selection Section (Only for Super Admin) */}
          {!user?.companyId && (
          <div className="form-section bg-light-primary">
            <h3 className="section-title text-primary">
              <i className="bi bi-building"></i> Company Assignment
            </h3>
            <div className="row">
              <div className="col-md-12 mb-3">
                <label className="form-label fw-bold">Select Company *</label>
                <select
                  name="company"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className={`form-select ${errors.company ? "is-invalid" : ""}`}
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
                {errors.company && <div className="invalid-feedback">{errors.company}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Personal Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="bi bi-person-fill"></i> Personal Information
          </h3>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                placeholder="Enter first name"
              />
              {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                placeholder="Enter last name"
              />
              {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`form-control ${errors.email ? "is-invalid" : ""}`} />
              {errors.email && <div className="invalid-feedback">{errors.email}</div>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Password *</label>
              <input type="password" name="password" value={formData.password} onChange={handleInputChange} className={`form-control ${errors.password ? "is-invalid" : ""}`} placeholder="Create password" />
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>
          </div>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} className="form-control">
                <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Nationality</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="form-control" />
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="bi bi-house-fill"></i> Address Information
          </h3>
          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Street Address</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Street address"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="form-control"
                placeholder="City"
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="form-control"
                placeholder="State"
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Postal Code"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="bi bi-book-fill"></i> Education
          </h3>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Highest Qualification</label>
              <select
                name="highestQualification"
                value={formData.highestQualification}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="">Select Qualification</option>
                <option value="high-school">High School</option>
                <option value="bachelors">Bachelor's Degree</option>
                <option value="masters">Master's Degree</option>
                <option value="phd">PhD</option>
                <option value="diploma">Diploma</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">University/Institution</label>
              <input
                type="text"
                name="university"
                value={formData.university}
                onChange={handleInputChange}
                className="form-control"
                placeholder="University or Institution name"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Graduation Year</label>
              <input
                type="number"
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleInputChange}
                className="form-control"
                placeholder="e.g., 2020"
                min="1950"
                max={new Date().getFullYear()}
              />
            </div>
          </div>
        </div>

        {/* Essential Employment Details */}
        <div className="form-section">
          <h3 className="section-title"><i className="bi bi-briefcase-fill"></i> Employment Details</h3>
          <div className="row">
            <div className="col-md-3 mb-3">
              <label className="form-label">Department *</label>
              <select name="department" value={formData.department} onChange={handleInputChange} className={`form-control ${errors.department ? "is-invalid" : ""}`}>
                <option value="">Select Department</option>
                <option value="engineering">Engineering</option><option value="sales">Sales</option><option value="marketing">Marketing</option><option value="hr">Human Resources</option><option value="finance">Finance</option><option value="operations">Operations</option>
              </select>
              {errors.department && <div className="invalid-feedback">{errors.department}</div>}
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Position *</label>
              <input type="text" name="position" value={formData.position} onChange={handleInputChange} className={`form-control ${errors.position ? "is-invalid" : ""}`} />
              {errors.position && <div className="invalid-feedback">{errors.position}</div>}
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Role Type</label>
              <select name="role" value={formData.role || 'employee'} onChange={handleInputChange} className="form-select">
                <option value="employee">Standard Employee</option>
                <option value="project_manager">Project Manager (Team Lead)</option>
              </select>
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Joining Date</label>
              <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="form-control" />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Assign Reporting HR</label>
              <select name="reportingManager" value={formData.reportingManager} onChange={handleInputChange} className="form-select">
                <option value="">-- Select HR Manager --</option>
                {availableHRs.map(hr => (
                  <option key={hr.id} value={hr.id}>{hr.name} ({hr.email})</option>
                ))}
              </select>
              <small className="text-muted">Shows HRs for the selected company</small>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Employment Type</label>
              <select name="employmentType" value={formData.employmentType} onChange={handleInputChange} className="form-control">
                <option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Shift Start Time</label>
              <input type="time" name="shiftStartTime" value={formData.shiftStartTime} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Shift End Time</label>
              <input type="time" name="shiftEndTime" value={formData.shiftEndTime} onChange={handleInputChange} className="form-control" />
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="bi bi-exclamation-circle-fill"></i> Emergency Contact
          </h3>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Full name"
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Phone number"
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Relation</label>
              <input
                type="text"
                name="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={handleInputChange}
                className="form-control"
                placeholder="e.g., Spouse, Parent"
              />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="form-section">
          <h3 className="section-title"><i className="bi bi-file-earmark-lock2-fill"></i> Identity Documents</h3>

          <div className="row mb-3">
            <div className="col-md-12">
              <div className="card p-3 border-secondary">
                <label className="form-label fw-bold">Upload Aadhar Card (PDF/Image)</label>
                <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={handleAadharFileChange} />
                <small className="text-muted">This document will be securely stored in the system.</small>
                {aadharFile && <p className="text-success mt-2"><i className="bi bi-check-circle"></i> Selected: {aadharFile.name}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Certificates Section (Optional) */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="bi bi-file-earmark-pdf"></i> Certificates (Optional)
          </h3>
          {/* Simplified Certificate UI */}
          <div className="row mb-3">
            <div className="col-md-5"><input type="text" placeholder="Certificate Name" className="form-control" value={certificateInput.name} onChange={e => setCertificateInput(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="col-md-5"><input type="file" className="form-control" id="certificateFile" onChange={handleCertificateFileChange} /></div>
            <div className="col-md-2"><button type="button" className="btn btn-success w-100" onClick={handleAddCertificate}>Add</button></div>
          </div>
          {certificates.length > 0 && (
            <ul className="list-group">
              {certificates.map(c => (
                <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                  {c.name} ({c.fileName}) <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveCertificate(c.id)}>X</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        </div> {/* End of form-sections-wrapper */}
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary me-2" onClick={() => window.history.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Submit & Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEmployee;
