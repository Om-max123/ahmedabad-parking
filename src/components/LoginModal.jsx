import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../utils/sound';

export default function LoginModal({ isOpen, onClose, currentUser, onLoginSuccess }) {
  const [tab, setTab] = useState('google'); // 'google' or 'dev'
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [carNumber, setCarNumber] = useState(currentUser?.carNumber || '');
  const [vehicleType, setVehicleType] = useState(currentUser?.vehicleType || 'compact');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const handleGoogleCredentialResponse = useCallback(async (response) => {
    if (!response || !response.credential) {
      setError('Google Sign-In did not return valid credentials.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
          phone: phone || undefined,
          carNumber: carNumber || undefined,
          vehicleType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      playSound('park');
      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to authenticate via Google.');
    } finally {
      setGoogleLoading(false);
    }
  }, [phone, carNumber, vehicleType, onLoginSuccess, onClose]);

  // Load Google Identity Services (GIS) library
  useEffect(() => {
    if (!isOpen) return;

    if (!googleClientId) {
      return;
    }

    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId);

    const initGsi = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.head.appendChild(script);
    } else {
      initGsi();
    }
  }, [isOpen, googleClientId, handleGoogleCredentialResponse]);

  if (!isOpen) return null;

  // Development Sign-In Submit
  const handleDevSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanPlate = carNumber.trim().toUpperCase().replace(/\s+/g, '-');

    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!cleanPlate) {
      setError('Please enter your vehicle / car registration number (e.g. GJ-01-AB-1234).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Driver',
          phone: cleanPhone,
          carNumber: cleanPlate,
          vehicleType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      playSound('park');
      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (sampleIndex = 0) => {
    playSound('click');
    const demoProfiles = [
      { name: 'Karan Patel', phone: '9876543210', plate: 'GJ-01-AB-1234', type: 'compact' },
      { name: 'Meera Shah (EV)', phone: '9825012345', plate: 'GJ-01-EV-5566', type: 'ev' },
      { name: 'Vikram Desai', phone: '9898011223', plate: 'GJ-27-XY-9009', type: 'suv' },
      { name: 'Municipal Admin Operator', phone: '9909988776', plate: 'GJ-01-ADM-007', type: 'compact' },
    ];
    const profile = demoProfiles[sampleIndex] || demoProfiles[0];
    setName(profile.name);
    setPhone(profile.phone);
    setCarNumber(profile.plate);
    setVehicleType(profile.type);
    setError('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className="modal-box login-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge login-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <h2 id="login-modal-title" className="modal-title">
                {currentUser ? 'Switch Driver Profile' : 'Driver Sign In / Register'}
              </h2>
              <p className="modal-subtitle">Ahmedabad Municipal Smart Mobility Account</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }} aria-label="Close modal">✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              color: tab === 'google' ? '#60A5FA' : '#94A3B8',
              fontWeight: tab === 'google' ? '600' : '500',
              borderBottom: tab === 'google' ? '2px solid #3B82F6' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => setTab('google')}
          >
            <span>Google Sign-In</span>
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              color: tab === 'dev' ? '#60A5FA' : '#94A3B8',
              fontWeight: tab === 'dev' ? '600' : '500',
              borderBottom: tab === 'dev' ? '2px solid #3B82F6' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => setTab('dev')}
          >
            <span>Development / Demo Sign-In</span>
          </button>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert" style={{ margin: '14px 20px 0' }}>
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ padding: '20px' }}>
          {tab === 'google' && (
            <div>
              {/* Google OAuth Status & Instructions */}
              {googleClientId ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', textAlign: 'center' }}>
                    Sign in with your verified Google account to manage your Ahmedabad mobility wallet and parking reservations.
                  </p>
                  <div ref={googleBtnRef} style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }}></div>
                  {googleLoading && (
                    <div style={{ textAlign: 'center', marginTop: '12px', color: '#60A5FA', fontSize: '13px' }}>
                      Verifying Google ID token with PostgreSQL...
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                  padding: '16px',
                  fontSize: '13px',
                  color: '#CBD5E1',
                  lineHeight: '1.6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px' }}>ℹ️</span>
                    <strong style={{ color: '#F8FAFC' }}>Google OAuth Setup Required</strong>
                  </div>
                  <p style={{ margin: '0 0 10px', color: '#94A3B8' }}>
                    Google OAuth 2.0 requires a valid <strong>Client ID</strong> configured in Google Cloud Console.
                  </p>
                  <ol style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#94A3B8' }}>
                    <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>Google Cloud Console → Credentials</a>.</li>
                    <li>Create OAuth 2.0 Web Client with authorized origin: <code>http://localhost:5173</code> (and your Vercel deployment URL).</li>
                    <li>Set <code>VITE_GOOGLE_CLIENT_ID</code> in your <code>.env</code> file.</li>
                  </ol>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#E2E8F0' }}>
                      <strong>Safe Testing:</strong> Use the <em>Development / Demo Sign-In</em> tab below to sign in instantly with PostgreSQL test driver profiles.
                    </p>
                    <button
                      type="button"
                      className="btn-reserve-primary"
                      style={{ width: '100%', padding: '10px' }}
                      onClick={() => setTab('dev')}
                    >
                      Switch to Development / Demo Sign-In →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'dev' && (
            <form onSubmit={handleDevSubmit} className="modal-form">
              {/* Quick test profiles */}
              <div className="demo-autofill-banner" style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  ⚡ Quick Demo Test Profiles (Pre-configured in PostgreSQL):
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-text-action" onClick={() => fillQuickDemo(0)}>
                    🚗 Karan (GJ-01 Sedan)
                  </button>
                  <button type="button" className="btn-text-action" onClick={() => fillQuickDemo(1)}>
                    ⚡ Meera (GJ-01 EV)
                  </button>
                  <button type="button" className="btn-text-action" onClick={() => fillQuickDemo(2)}>
                    🚙 Vikram (GJ-27 SUV)
                  </button>
                  <button type="button" className="btn-text-action" onClick={() => fillQuickDemo(3)} style={{ color: '#F59E0B' }}>
                    🛡️ Admin Operator
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="driver-name-input" className="form-label">Driver Name</label>
                <input
                  id="driver-name-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rahul Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <label htmlFor="driver-phone-input" className="form-label">Mobile Phone Number (10 Digits)</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">+91</span>
                  <input
                    id="driver-phone-input"
                    type="tel"
                    className="form-input with-prefix"
                    placeholder="10-digit mobile number"
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>
              </div>

              {/* Vehicle / Car Registration Number */}
              <div className="form-group">
                <label htmlFor="driver-car-input" className="form-label">Gujarat RTO Vehicle Plate</label>
                <div className="plate-input-container">
                  <span className="plate-badge-side">IND</span>
                  <input
                    id="driver-car-input"
                    type="text"
                    className="form-input plate-input uppercase-text"
                    placeholder="e.g. GJ-01-AB-1234"
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <span className="field-hint">e.g. GJ-01 (Ahmedabad City), GJ-27 (East), GJ-18 (Gandhinagar)</span>
              </div>

              {/* Vehicle Type */}
              <div className="form-group">
                <label className="form-label">Vehicle Category</label>
                <div className="vehicle-type-mini-selector" role="radiogroup" aria-label="Vehicle Type">
                  {[
                    { id: 'compact', label: 'Sedan / Car', icon: '🚗' },
                    { id: 'suv', label: 'SUV', icon: '🚙' },
                    { id: 'ev', label: 'EV Electric', icon: '⚡' },
                    { id: 'bike', label: 'Two-Wheeler', icon: '🏍️' },
                  ].map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className={`type-pill-btn ${vehicleType === v.id ? 'active' : ''}`}
                      onClick={() => { playSound('click'); setVehicleType(v.id); }}
                      role="radio"
                      aria-checked={vehicleType === v.id}
                    >
                      <span>{v.icon}</span>
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => { playSound('click'); onClose(); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-confirm-park"
                  disabled={loading}
                >
                  {loading ? 'Authenticating with PostgreSQL...' : 'Sign In & Connect Wallet'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
