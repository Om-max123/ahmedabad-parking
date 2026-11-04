import React from 'react';

export default function StatsCards({ slots = [], totalRevenue = 1850 }) {
  const total = slots.length;
  const occupied = slots.filter(s => s.status === 'occupied').length;
  const available = total - occupied;
  const evCharging = slots.filter(s => s.type === 'ev' && s.status === 'occupied').length;
  const evTotal = slots.filter(s => s.type === 'ev').length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const availableRate = 100 - occupancyRate;

  return (
    <section className="stats-grid" aria-label="Facility Real-Time Performance">
      {/* 1. Available Bays */}
      <div className="stat-card available-card">
        <div className="stat-card-header">
          <span className="stat-title">Available Parking Bays</span>
          <div className="stat-icon-wrapper available-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
        <div className="stat-main">
          <div className="stat-number-wrap">
            <span className="stat-number text-emerald">{available}</span>
            <span className="stat-unit">bays</span>
          </div>
          <span className="stat-subtext">{availableRate}% of {total} total capacity</span>
        </div>
        <div className="stat-footer">
          <span className="trend-badge positive">
            <span className="dot pulse"></span>
            Open for Immediate Entry
          </span>
        </div>
      </div>

      {/* 2. Occupied Bays */}
      <div className="stat-card occupied-card">
        <div className="stat-card-header">
          <span className="stat-title">Active Parked Sessions</span>
          <div className="stat-icon-wrapper occupied-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
        </div>
        <div className="stat-main">
          <div className="stat-number-wrap">
            <span className="stat-number text-slate">{occupied}</span>
            <span className="stat-unit">vehicles</span>
          </div>
          <span className="stat-subtext">Live IoT sensor monitoring</span>
        </div>
        <div className="stat-footer">
          <div className="progress-bar-container" title={`${occupancyRate}% Lot Capacity Utilized`}>
            <div className="progress-bar-fill" style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <span className="occupancy-pct">{occupancyRate}% Lot Occupied</span>
        </div>
      </div>

      {/* 3. EV Fast Charging Stations */}
      <div className="stat-card ev-card">
        <div className="stat-card-header">
          <span className="stat-title">EV Charging Hub</span>
          <div className="stat-icon-wrapper ev-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
        </div>
        <div className="stat-main">
          <div className="stat-number-wrap">
            <span className="stat-number text-cyan">{evCharging}</span>
            <span className="stat-unit">of {evTotal || 3} active</span>
          </div>
          <span className="stat-subtext">Clean Energy DC Fast Charging</span>
        </div>
        <div className="stat-footer">
          <span className="ev-badge">
            <span className="sparkle">⚡</span> High-Speed 60kW CCS2
          </span>
        </div>
      </div>

      {/* 4. Gross Revenue Collections */}
      <div className="stat-card revenue-card">
        <div className="stat-card-header">
          <span className="stat-title">Today's Collections</span>
          <div className="stat-icon-wrapper revenue-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>
        <div className="stat-main">
          <div className="stat-number-wrap">
            <span className="stat-number text-amber">₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>
          <span className="stat-subtext">Automated Digital Billing</span>
        </div>
        <div className="stat-footer">
          <span className="revenue-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            5% Municipal GST Audited
          </span>
        </div>
      </div>
    </section>
  );
}
