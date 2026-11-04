import React from 'react';

export default function AnalyticsView({ locations = [], slots = [], totalRevenue = 1850 }) {
  // Aggregate stats across all Ahmedabad locations
  const totalSlotsAcrossAll = locations.reduce((sum, l) => sum + (l.slots?.length || 0), 0) || (slots.length * locations.length);
  const totalOccupiedCurrent = slots.filter(s => s.status === 'occupied').length;
  const occupancyRate = slots.length > 0 ? Math.round((totalOccupiedCurrent / slots.length) * 100) : 42;

  // Hourly traffic profile for Ahmedabad urban hubs (8 AM to 10 PM)
  const hourlyData = [
    { hour: '08:00', vol: 35 },
    { hour: '10:00', vol: 88 },
    { hour: '12:00', vol: 64 },
    { hour: '14:00', vol: 48 },
    { hour: '16:00', vol: 72 },
    { hour: '18:00', vol: 96 },
    { hour: '20:00', vol: 92 },
    { hour: '22:00', vol: 50 },
  ];

  // Payment breakdown
  const paymentBreakdown = [
    { method: 'UPI (GPay / PhonePe / Paytm)', pct: 62, amount: Math.round(totalRevenue * 0.62), color: '#10b981' },
    { method: 'FASTag RFID Auto-Debit', pct: 24, amount: Math.round(totalRevenue * 0.24), color: '#38bdf8' },
    { method: 'Credit / Debit Card', pct: 10, amount: Math.round(totalRevenue * 0.10), color: '#a855f7' },
    { method: 'Cash / Manual Counter', pct: 4, amount: Math.round(totalRevenue * 0.04), color: '#f59e0b' },
  ];

  // Sensor averages
  const avgTemp = 28.4;
  const avgNoise = 52.8;
  const evSlotsCount = slots.filter(s => s.type === 'ev').length;

  return (
    <div className="analytics-view-container">
      {/* Top Banner / Executive Summary */}
      <div className="analytics-header">
        <div>
          <span className="analytics-badge">SMART CITY IOT TELEMETRY</span>
          <h2 className="analytics-title">Ahmedabad Urban Mobility & Telemetry Insights</h2>
          <p className="analytics-subtitle">
            Real-time multi-sensor telemetry, dynamic pricing surge factors, and fiscal collections
          </p>
        </div>
        <div className="analytics-status-tag">
          <span className="dot-pulse"></span>
          <span>8 Hubs Reporting Live</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Network Capacity</span>
            <span className="kpi-icon">🏙️</span>
          </div>
          <div className="kpi-value">
            {locations.length} <span className="kpi-unit">Hubs</span>
          </div>
          <div className="kpi-meta text-emerald">
            {totalSlotsAcrossAll || 192} total IoT-monitored bays
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Current Facility Occupancy</span>
            <span className="kpi-icon">📊</span>
          </div>
          <div className="kpi-value">
            {occupancyRate}%
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">EV Clean Energy Hub</span>
            <span className="kpi-icon">⚡</span>
          </div>
          <div className="kpi-value">
            18 <span className="kpi-unit">CCS2 Bays</span>
          </div>
          <div className="kpi-meta text-cyan">
            ~142 kWh dispensed today (92 kg CO₂ saved)
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Gross Collections</span>
            <span className="kpi-icon">🧾</span>
          </div>
          <div className="kpi-value">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="kpi-meta text-purple">
            100% GST compliant fiscal invoicing
          </div>
        </div>
      </div>

      {/* Charts & Split Grid */}
      <div className="analytics-content-split">
        {/* Chart 1: Hourly Occupancy Trend */}
        <div className="analytics-card chart-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Hourly Traffic Density & Demand Curve</h3>
              <p className="card-desc">Average bay utilization profile across Ahmedabad commercial zones</p>
            </div>
            <span className="peak-tag">Peak: 18:00 - 20:00</span>
          </div>

          <div className="hourly-bars-container">
            {hourlyData.map((d, i) => (
              <div key={i} className="hourly-bar-col">
                <div className="bar-wrapper">
                  <div
                    className={`bar-fill ${d.vol >= 85 ? 'high' : d.vol >= 60 ? 'medium' : 'normal'}`}
                    style={{ height: `${d.vol}%` }}
                    title={`${d.hour}: ${d.vol}% Occupancy`}
                  ></div>
                </div>
                <span className="bar-label">{d.hour}</span>
                <span className="bar-val">{d.vol}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Payment Distribution */}
        <div className="analytics-card payment-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Fiscal Revenue by Payment Gateway</h3>
              <p className="card-desc">Digital collection channel distribution (INR)</p>
            </div>
          </div>

          <div className="payment-distribution-list">
            {paymentBreakdown.map((p, i) => (
              <div key={i} className="payment-method-item">
                <div className="payment-item-header">
                  <span className="method-name">{p.method}</span>
                  <span className="method-amt">₹{p.amount.toLocaleString('en-IN')} ({p.pct}%)</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="fastag-auto-pill">
            <span className="pill-icon">🏷️</span>
            <span>FASTag Toll & Parking Integration: 99.8% contactless auto-barrier clearance</span>
          </div>
        </div>
      </div>

      {/* Hub Performance Table */}
      <div className="analytics-card leaderboard-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">Ahmedabad Facilities Operational Matrix</h3>
            <p className="card-desc">Comprehensive status report across all 8 civic parking facilities</p>
          </div>
        </div>

        <div className="facility-matrix-scroll">
          <table className="facility-matrix-table">
            <thead>
              <tr>
                <th>Facility Name</th>
                <th>Area / Hub</th>
                <th>Hourly Tariff</th>
                <th>Rating</th>
                <th>Total Bays</th>
                <th>Sensors</th>
                <th>Surge Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td className="loc-name-cell">
                    <strong>{loc.name}</strong>
                  </td>
                  <td>{loc.area}</td>
                  <td className="tariff-cell">₹{loc.hourlyRate}/hr</td>
                  <td>
                    <span className="rating-pill">⭐ {loc.rating || 4.8}</span>
                  </td>
                  <td>{loc.slots?.length || 24} Bays</td>
                  <td>
                    <span className="sensor-tag">Ultrasonic • Noise • Temp</span>
                  </td>
                  <td>
                    <span className="multiplier-pill">1.0x Normal</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
