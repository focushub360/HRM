import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import FaceCaptureModal from './employee/FaceCaptureModal.jsx';
import './Auth.css';
import loginLogo from '../assets/Logo.png';
import logoDark from '../assets/Logo_Dark.png';
import {
  BiUser,
  BiBuilding,
  BiBriefcase,
  BiArrowBack,
  BiEnvelope,
  BiLockAlt,
  BiRightArrowAlt,
  BiRocket,
  BiShow,
  BiHide
} from 'react-icons/bi';

const Login = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { login, authenticate, isAuthenticated } = useAuth();
  const [loginType, setLoginType] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', employeeType: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [showRocket, setShowRocket] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigate when authentication succeeds
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!formData.email.includes('@')) {
      setError('Please enter a valid User ID containing "@"');
      return;
    }

    setLoading(true);
    setShowRocket(true);
    setLoadingPercent(0);

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 95) progress = 95;
      setLoadingPercent(progress);
    }, 50);

    try {
      const authResult = await authenticate(null, formData.email, formData.password);
      
      if (!authResult) {
        clearInterval(progressInterval);
        setShowRocket(false);
        setError('Invalid credentials');
        setLoading(false);
        return;
      }

      clearInterval(progressInterval);
      setLoadingPercent(100);

      setTimeout(() => {
        const isElectron = navigator.userAgent.toLowerCase().includes(' electron/');
        const loginSource = isElectron ? 'Desktop' : 'Web';

        const userData = {
          ...authResult,
          timestamp: new Date().toISOString(),
          loginSource
        };

        login(userData);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setShowRocket(false);
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="glass-container">
        {/* Left Hero Section */}
        <div className="login-hero">
          <div className="hero-content">
            <div className="hero-logo mb-2">
              <img
                src={theme === 'dark' ? logoDark : loginLogo}
                alt="Focus Engineering"
                className="img-fluid"
                style={{
                  maxHeight: '80px',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))'
                }}
              />
            </div>
            <h1 className="hero-title mt-1">HRMS System</h1>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="login-form-container">
          <div className="login-content">
            {/* Login Form View */}
            <div className="form-view">
              <div className="form-header">
                <h2>
                  Sign In to Your Account
                </h2>
                <p>Enter your credentials to access your account</p>
              </div>

              {showRocket ? (
                <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '320px' }}>
                  <BiRocket 
                    size={70} 
                    color="#4f46e5" 
                    className="mb-4" 
                    style={{
                      transform: `translateY(-${loadingPercent / 2}px) rotate(45deg)`,
                      transition: 'transform 0.1s ease-out'
                    }} 
                  />
                  <h4 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Authenticating...</h4>
                  
                  <div className="w-100 bg-light rounded-pill mb-2 border" style={{ height: '14px', overflow: 'hidden' }}>
                    <div 
                      className="h-100 rounded-pill" 
                      style={{ 
                        width: `${loadingPercent}%`, 
                        background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
                        transition: 'width 0.1s ease-out' 
                      }}
                    ></div>
                  </div>
                  
                  <h5 className="fw-bold text-muted">{loadingPercent}%</h5>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="modern-form" autoComplete="off">
                  <div className="auth-input-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="modern-input"
                      placeholder="name@company.com"
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div className="auth-input-group mb-4">
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder="Enter your password"
                        required
                        autoComplete="new-password"
                        style={{ paddingRight: '45px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showPassword ? <BiHide size={20} /> : <BiShow size={20} />}
                      </button>
                    </div>
                  </div>

                  {error && <div className="alert alert-danger">{error}</div>}

                  <button type="submit" className="submit-btn mt-3" disabled={loading}>
                    Sign In <BiRightArrowAlt size={20} />
                  </button>
                </form>
              )}

              <div className="login-footer mt-4">
                <p>Need help? <a href="https://mail.google.com/mail/?view=cm&fs=1&to=bharathanvicky@gmail.com" target="_blank" rel="noopener noreferrer">Contact Support</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
