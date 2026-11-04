import React, { useState } from 'react';
import { playSound } from '../utils/sound';

export default function HeroLandingBanner({
  currentUser,
  onOpenLogin,
  onSearchNeighborhood,
  onSelectFacility,
  locations = [],
  totalAvailable = 0,
}) {
  const [query, setQuery] = useState('');

  const quickAreas = [
    { name: 'Thaltej', label: 'Thaltej Metro', id: 'loc-thaltej' },
    { name: 'Navrangpura', label: 'CG Road', id: 'loc-cg-road' },
    { name: 'Vastrapur', label: 'Vastrapur Lake', id: 'loc-vastrapur' },
    { name: 'Bodakdev', label: 'Sindhu Bhavan', id: 'loc-sbr' },
    { name: 'Riverfront West', label: 'Sabarmati Riverfront', id: 'loc-riverfront' },
    { name: 'SG Highway / Prahlad Nagar', label: 'Prahlad Nagar', id: 'loc-prahlad-nagar' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchNeighborhood) {
      playSound('click');
      onSearchNeighborhood(query.trim());
    }
  };

  const handlePillClick = (area) => {
    playSound('click');
    setQuery(area.name);
    if (area.id && onSelectFacility) {
      onSelectFacility(area.id);
    }
    if (onSearchNeighborhood) {
      onSearchNeighborhood(area.name);
    }
  };

  return (
    <section className="hero-landing-banner" aria-label="Ahmedabad Smart Parking Introduction">
      <div className="hero-banner-inner">
        {/* Top Badges */}
        <div className="hero-badge-row">
          <div className="hero-official-badge">
            <span className="hero-badge-dot"></span>
            <span>AHMEDABAD MUNICIPAL CORPORATION • SMART MOBILITY INITIATIVE</span>
          </div>
          <div className="hero-capacity-pill">
            <span>🟢 {totalAvailable} Bays Free Across 9 Hubs</span>
          </div>
        </div>

        {/* Hero Headline */}
        <h1 className="hero-headline">
          Reserve Parking Across <span className="hero-gradient-text">Ahmedabad</span> in Real-Time
        </h1>
        <p className="hero-subheadline">
          Guaranteed multi-level and open parking bay reservations for Thaltej, Sindhu Bhavan, CG Road, Vastrapur, and key commercial hubs. Integrated with PostgreSQL financial ledger, FASTag RFID gate clearance, and instant wallet refunds.
        </p>

        {/* Search Bar for Neighborhoods */}
        <form onSubmit={handleSearchSubmit} className="hero-search-box">
          <div className="hero-search-input-wrap">
            <svg className="hero-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Search by neighborhood or locality (e.g. Thaltej, Navrangpura, Bodakdev)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (onSearchNeighborhood) onSearchNeighborhood(e.target.value);
              }}
              aria-label="Search Ahmedabad neighborhood"
            />
            {query && (
              <button
                type="button"
                className="hero-search-clear"
                onClick={() => {
                  setQuery('');
                  if (onSearchNeighborhood) onSearchNeighborhood('');
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="hero-search-btn">
            Find Parking
          </button>
        </form>

        {/* Quick Locality Pills */}
        <div className="hero-pills-row">
          <span className="hero-pills-label">Popular Localities:</span>
          <div className="hero-pills-list">
            {quickAreas.map((area) => (
              <button
                key={area.name}
                type="button"
                className="hero-area-pill"
                onClick={() => handlePillClick(area)}
              >
                📍 {area.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobility Value Pillars */}
        <div className="hero-pillars-grid">
          <div className="hero-pillar-card">
            <div className="pillar-icon">⚡</div>
            <div className="pillar-text">
              <strong>Thaltej & SBR Metro Corridors</strong>
              <p>Direct parking next to Thaltej Cross Roads Metro Station & Sindhu Bhavan corporate hub.</p>
            </div>
          </div>

          <div className="hero-pillar-card">
            <div className="pillar-icon">💳</div>
            <div className="pillar-text">
              <strong>Smart Mobility Wallet Ledger</strong>
              <p>ACID-compliant transactions in PostgreSQL. Cancel anytime for automatic 100% wallet refund.</p>
            </div>
          </div>

          <div className="hero-pillar-card">
            <div className="pillar-icon">🚗</div>
            <div className="pillar-text">
              <strong>FASTag & ANPR Boom Barrier</strong>
              <p>Automated arrival check-in with gate clearance pass and digital permit QR code.</p>
            </div>
          </div>
        </div>

        {/* Call to action for logged-out users */}
        {!currentUser && (
          <div className="hero-auth-cta-bar">
            <span>Ready to reserve your parking bay?</span>
            <button
              type="button"
              className="hero-signin-btn"
              onClick={() => {
                playSound('click');
                if (onOpenLogin) onOpenLogin();
              }}
            >
              Sign In with Google or Driver Profile →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

