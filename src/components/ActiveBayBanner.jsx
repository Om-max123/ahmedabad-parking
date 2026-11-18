import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';

export default function ActiveBayBanner({
  bookings = [],
  onCancelBooking,
  onViewReceipt,
  locations = [],
}) {
  const activeBookings = (bookings || []).filter(b => b.status === 'active');
  const [cancellingId, setCancellingId] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Timer update every 10 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  if (activeBookings.length === 0) return null;

  const currentBooking = activeBookings[activeIdx] || activeBookings[0];
  const loc = locations.find(l => l.id === currentBooking.locationId);

  // Calculate remaining time
  const rawParked = Number(currentBooking.parkedAt);
  const parkedAt = !isNaN(rawParked) && rawParked > 0 ? rawParked : new Date(currentBooking.parkedAt).getTime();
  const durationMs = (currentBooking.bookedDurationHours || 2) * 60 * 60 * 1000;
  const expiresAt = (parkedAt || Date.now()) + durationMs;
  const remainingMs = expiresAt - Date.now();
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const timeRemainingText = remainingMs > 0
    ? `${remainingHours > 0 ? `${remainingHours}h ` : ''}${Math.max(1, remainingMinutes)}m remaining`
    : 'Pass Active • Gate Exit Ready';

  const handleCancel = async (booking) => {
    const cost = booking.prepaidAmount || (booking.hourlyRate * (booking.bookedDurationHours || 2) * 1.05);
    const confirmMsg = `Release & Cancel Bay ${booking.slotId} at ${booking.locationName}?\n\n₹${Number(cost).toFixed(2)} will be refunded in full if cancelled within 15 minutes of booking; after that, only unused hours are refunded to your Smart Wallet.`;
    if (!window.confirm(confirmMsg)) return;

    playSound('click');
    setCancellingId(booking.bookingId);
    try {
      if (onCancelBooking) {
        await onCancelBooking(booking.bookingId);
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const directionsUrl = loc?.lat && loc?.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBooking.locationName + ' Ahmedabad')}`;

  return (
    <section className="active-bay-webpage-banner" aria-label="Active Parking Permit">
      <div className="active-bay-container">
        {/* Header Ribbon */}
        <div className="active-bay-header">
          <div className="active-bay-title-wrap">
            <span className="live-bay-pulse"></span>
            <span className="live-bay-badge">BAY RECEIVED & ACTIVE ON DASHBOARD</span>
            <span className="active-facility-tag">
              {currentBooking.locationName} • {currentBooking.locationArea || loc?.area || 'Ahmedabad'}
            </span>
          </div>

          {activeBookings.length > 1 && (
            <div className="multi-bay-switch">
              {activeBookings.map((b, idx) => (
                <button
                  key={b.bookingId}
                  className={`multi-bay-btn ${idx === activeIdx ? 'active' : ''}`}
                  onClick={() => { playSound('click'); setActiveIdx(idx); }}
                >
                  Bay {b.slotId}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="active-bay-body">
          {/* Bay Spotlight Box */}
          <div className="active-bay-spotlight">
            <span className="spotlight-label">RESERVED BAY</span>
            <div className="spotlight-bay-code">
              Bay {currentBooking.slotId}
            </div>
            <div className="spotlight-zone">
              Zone {currentBooking.zone || 'A'} • {currentBooking.vehicleType?.toUpperCase() || 'COMPACT'}
            </div>
          </div>

          {/* Details Column */}
          <div className="active-bay-details-grid">
            <div className="detail-item">
              <span className="detail-label">VEHICLE PLATE</span>
              <span className="detail-value plate-chip">{currentBooking.plate}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">DRIVER</span>
              <span className="detail-value">{currentBooking.driver}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">TIME REMAINING</span>
              <span className={`detail-value countdown-chip ${remainingMs <= 900000 ? 'urgent' : ''}`}>
                ⏱️ {timeRemainingText}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">FASTAG / BARRIER CODE</span>
              <span className="detail-value code-chip">
                {currentBooking.bookingId}
                <small className="barrier-verified-tag">✓ Pre-Approved</small>
              </span>
            </div>
          </div>

          {/* Actions Column */}
          <div className="active-bay-actions-col">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-bay-directions"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
              Directions
            </a>

            <button
              type="button"
              className="btn-bay-cancel"
              onClick={() => handleCancel(currentBooking)}
              disabled={cancellingId === currentBooking.bookingId}
            >
              {cancellingId === currentBooking.bookingId ? (
                'Refunding...'
              ) : (
                '🔄 Release & Cancel (Refund)'
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

