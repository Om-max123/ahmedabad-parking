import React, { useState, useEffect } from 'react';

export default function Navbar({
  currentUser,
  walletBalance = 500,
  onOpenWallet,
  onOpenLogin,
  onLogout,
  onOpenBookModal,
  onOpenMyBookings,
  onOpenDatabaseModal,
  onOpenVehicleOwners,
  onOpenVehiclesModal,
  onOpenAdmin,
  activeBookingsCount = 0,
  ownersCount = 0,
  activeTab = 'bays',
  dbConnected = false,
  selectedLocationName,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand Identity */}
        <div className="brand-group">
          <div className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="#0071E3" />
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="brand-titles">
            <div className="brand-title-wrap">
              <span className="brand-title">Ahmedabad Smart Parking</span>
              <span className="brand-pill">MUNICIPAL MOBILITY</span>
            </div>
            <p className="brand-tagline">
              AMC Urban Mobility & PostgreSQL Ledger • Ahmedabad, Gujarat
            </p>
          </div>
        </div>

        {/* Center Live Telemetry & Database Status Trigger */}
        <div className="status-indicators">
          <div className="live-clock-pill" title="Indian Standard Time (IST)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="clock-time">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Database Status Button */}
          <button 
            className={`db-telemetry-pill ${dbConnected ? 'connected' : 'dual-mode'}`}
            onClick={onOpenDatabaseModal}
            title="Click to inspect PostgreSQL schema & table specifications"
          >
            <span className="pulse-indicator"></span>
            <span className="db-label">
              {dbConnected ? 'PostgreSQL Active' : 'PostgreSQL Schema'}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Action Controls & User Account */}
        <div className="navbar-actions">
          {/* My Registered Vehicles */}
          <button
            className="action-pill-btn secondary"
            onClick={onOpenVehiclesModal}
            title="My Registered Vehicles & Gujarat RTO Verification"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
              <circle cx="7" cy="17" r="2"></circle>
              <circle cx="17" cy="17" r="2"></circle>
            </svg>
            <span>My Vehicles</span>
          </button>

          {/* Active Passes Button */}
          <button 
            className="action-pill-btn secondary bookings-pill"
            onClick={onOpenMyBookings}
            title="View Active Parking Passes and History"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>My Passes</span>
            {activeBookingsCount > 0 && (
              <span className="badge-count-red">{activeBookingsCount}</span>
            )}
          </button>

          {/* Smart Wallet Balance & Top-Up Pill */}
          <button
            className="action-pill-btn secondary wallet-nav-pill"
            onClick={onOpenWallet}
            title="Smart Mobility Digital Wallet (Click to Top-Up / View Ledger)"
          >
            <span className="wallet-icon-symbol">💳</span>
            <span>Wallet</span>
            <span className="badge-count-green">₹{(walletBalance ?? 500).toFixed(0)}</span>
          </button>

          {/* Admin Command Trigger (if admin) */}
          {currentUser && currentUser.role === 'admin' && (
            <button
              className={`action-pill-btn secondary ${activeTab === 'admin' ? 'active-pill' : ''}`}
              onClick={onOpenAdmin}
              style={{ border: '1px solid #F59E0B', color: '#FBBF24' }}
              title="Municipal Traffic Command Center"
            >
              <span>🛡️ Admin</span>
            </button>
          )}

          {/* Driver Account / Login Button */}
          {currentUser ? (
            <div className="user-profile-pill" onClick={onOpenLogin} title="Click to view driver details">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span className="user-avatar-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
              )}
              <div className="user-pill-text">
                <span className="user-car-plate">{currentUser.carNumber}</span>
                <span className="user-driver-name">{currentUser.name?.split(' ')[0]}</span>
              </div>
              <button 
                className="btn-logout-mini" 
                onClick={(e) => { e.stopPropagation(); onLogout(); }}
                title="Sign Out"
                aria-label="Logout"
              >
                ✕
              </button>
            </div>
          ) : (
            <button 
              className="action-pill-btn secondary user-login-btn"
              onClick={onOpenLogin}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Driver Sign In</span>
            </button>
          )}

          {/* Reserve Bay Primary Action */}
          <button 
            className="primary-cta-btn"
            onClick={onOpenBookModal}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Reserve Bay</span>
          </button>
        </div>
      </div>
    </header>
  );
}
