import React, { useState } from 'react';
import { playSound } from '../utils/sound';

export default function MyBookingsModal({
  isOpen,
  onClose,
  bookings = [],
  onSelectCheckout,
  onCancelBooking,
  currentUser,
  onOpenLogin,
}) {
  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState('');

  if (!isOpen) return null;

  const activeBookings = (bookings || []).filter(b => b.status === 'active');
  const pastBookings = (bookings || []).filter(b => b.status === 'completed' || b.status === 'cancelled');

  const handleCancelClick = async (booking) => {
    const cost = booking.receipt?.totalAmount || (booking.hourlyRate * (booking.bookedDurationHours || 2) * 1.05);
    const confirmMsg = `Cancel reservation for Bay ${booking.slotId} (${booking.locationName})?\n\n₹${Number(cost).toFixed(2)} will be refunded immediately back to your Smart Wallet in PostgreSQL.`;
    if (!window.confirm(confirmMsg)) return;

    playSound('click');
    setProcessingId(booking.bookingId);
    setActionError('');
    try {
      if (onCancelBooking) {
        await onCancelBooking(booking.bookingId);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to cancel booking.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckoutClick = (booking) => {
    playSound('click');
    onClose();
    if (onSelectCheckout) {
      onSelectCheckout(booking.locationId, booking.slotId, booking.bookingId);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="my-bookings-modal-title">
      <div className="modal-box my-bookings-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge bookings-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <h2 id="my-bookings-modal-title" className="modal-title">My Parking Reservations</h2>
              <p className="modal-subtitle">
                {currentUser ? `Active passes for ${currentUser.carNumber} (${currentUser.name})` : 'All recent passes'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }} aria-label="Close modal">✕</button>
        </div>

        {actionError && (
          <div className="modal-error-banner" role="alert" style={{ margin: '16px 24px 0' }}>
            <span>⚠️ {actionError}</span>
          </div>
        )}

        {/* Content */}
        <div className="bookings-modal-content">
          {!currentUser ? (
            <div className="empty-bookings-box" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <span className="empty-icon">🔐</span>
              <h3 style={{ fontSize: '17px', color: '#F9FAFB', margin: '12px 0 6px' }}>Sign In Required</h3>
              <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '18px' }}>
                Please sign in with your vehicle plate to view your active parking permits and history.
              </p>
              <button
                type="button"
                className="btn-reserve-primary"
                onClick={() => {
                  onClose();
                  if (onOpenLogin) onOpenLogin();
                }}
              >
                Sign In Driver Profile
              </button>
            </div>
          ) : (
            <>
              {/* Active Bookings Section */}
              <div className="bookings-section">
                <h3 className="section-title">
                  <span className="dot-green"></span>
                  Active Passes ({activeBookings.length})
                </h3>

                {activeBookings.length === 0 ? (
                  <div className="empty-bookings-box">
                    <span className="empty-icon">🚗</span>
                    <p>No active parked vehicles right now.</p>
                    <span className="empty-sub">Reserve a parking bay at any Ahmedabad location!</span>
                  </div>
                ) : (
                  <div className="bookings-cards-list">
                    {activeBookings.map((b) => {
                      const parkedAt = b.parkedAt || Date.now();
                      const diffMins = Math.max(0, Math.floor((Date.now() - parkedAt) / 60000));
                      const hours = Math.floor(diffMins / 60);
                      const mins = diffMins % 60;
                      const isBusy = processingId === b.bookingId;

                      return (
                        <div key={b.bookingId} className="active-booking-card">
                          <div className="booking-card-top">
                            <div>
                              <span className="booking-id-tag">{b.bookingId}</span>
                              <h4 className="booking-loc-name">{b.locationName}</h4>
                              <span className="booking-loc-area">📍 {b.locationArea}</span>
                            </div>
                            <div className="license-plate small">
                              <span className="plate-band">IND</span>
                              <span className="plate-text">{b.plate}</span>
                            </div>
                          </div>

                          <div className="booking-details-grid">
                            <div className="detail-item">
                              <span className="d-label">Bay Number</span>
                              <span className="d-val">Bay {b.slotId} (Zone {b.zone || 'A'})</span>
                            </div>
                            <div className="detail-item">
                              <span className="d-label">Driver</span>
                              <span className="d-val">{b.driver}</span>
                            </div>
                            <div className="detail-item">
                              <span className="d-label">Parked Time</span>
                              <span className="d-val">
                                {new Date(parkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({hours}h {mins}m ago)
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="d-label">Tariff Status</span>
                              <span className="d-val" style={{ color: '#10B981', fontWeight: 600 }}>
                                ✓ Pre-Paid via Smart Wallet
                              </span>
                            </div>
                          </div>

                          <div className="booking-card-actions" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button
                              type="button"
                              className="btn-checkout-ticket"
                              onClick={() => handleCheckoutClick(b)}
                              disabled={isBusy}
                              style={{ flex: 1 }}
                            >
                              {isBusy ? 'Processing...' : 'Conclude & Exit Bay'}
                            </button>

                            <button
                              type="button"
                              className="btn-cancel"
                              onClick={() => handleCancelClick(b)}
                              disabled={isBusy}
                              style={{
                                flex: 1,
                                borderColor: '#EF4444',
                                color: '#EF4444',
                                background: 'rgba(239, 68, 68, 0.08)',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: isBusy ? 'not-allowed' : 'pointer'
                              }}
                              title="Cancel parking pass and refund money to your Smart Wallet"
                            >
                              {isBusy ? 'Refunding...' : 'Cancel & Refund'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past Completed Bookings */}
              {pastBookings.length > 0 && (
                <div className="bookings-section past-section">
                  <h3 className="section-title">Past Parking History</h3>
                  <div className="past-bookings-list">
                    {pastBookings.slice(0, 8).map((b) => (
                      <div key={b.bookingId} className="past-booking-row">
                        <div className="pb-left">
                          <strong>{b.plate}</strong>
                          <span>{b.locationName} (Bay {b.slotId})</span>
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>
                            {b.parkedAt ? new Date(b.parkedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="pb-right">
                          {b.receipt && (
                            <span className="pb-amount">₹{b.receipt.totalAmount}</span>
                          )}
                          <span className={`pb-status ${b.status === 'cancelled' ? 'cancelled' : ''}`} style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: b.status === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: b.status === 'cancelled' ? '#EF4444' : '#10B981'
                          }}>
                            {b.status === 'cancelled' ? 'Refunded' : 'Completed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
