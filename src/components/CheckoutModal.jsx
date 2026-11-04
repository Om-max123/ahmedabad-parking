import React, { useState } from 'react';
import { VEHICLE_TYPES } from '../utils/parkingData';
import { playSound } from '../utils/sound';

export default function CheckoutModal({
  isOpen,
  onClose,
  slot,
  location,
  currentUser,
  authToken,
  onCheckoutConfirm
}) {
  const [paymentMethod, setPaymentMethod] = useState('SMART_WALLET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !slot || !slot.vehicle) return null;

  const vehicle = slot.vehicle;
  const vehicleTypeInfo = VEHICLE_TYPES[vehicle.type] || VEHICLE_TYPES.compact;
  const now = Date.now();
  const entryTime = vehicle.parkedAt || (now - 60 * 60 * 1000);
  const diffMs = Math.max(0, now - entryTime);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Billed hours
  const billedHours = Math.max(1, Math.ceil(totalMinutes / 60));
  const ratePerHour = location?.hourlyRate || vehicleTypeInfo.baseRate || 30;
  const subtotal = billedHours * ratePerHour;
  const tax = Number((subtotal * 0.05).toFixed(2));
  const totalAmount = Number((subtotal + tax).toFixed(2));

  const isOwner = currentUser && (
    (vehicle.plate && vehicle.plate === currentUser.carNumber) ||
    currentUser.role === 'admin'
  );

  const handleCheckout = async () => {
    if (!isOwner) {
      setError('Access Denied: Only the verified driver of this vehicle can release this bay.');
      return;
    }

    setLoading(true);
    setError('');
    playSound('unpark');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          locationId: location?.id,
          slotId: slot.id,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to checkout bay');
      }

      onCheckoutConfirm(slot.id, totalAmount, data.receipt);
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
      <div className="modal-box checkout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge checkout">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div>
              <h2 id="checkout-modal-title" className="modal-title">Vehicle Checkout & Exit</h2>
              <p className="modal-subtitle">{location?.name || 'Smart Parking Bay'} • Ahmedabad</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }} aria-label="Close modal">✕</button>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert" style={{ margin: '16px 24px 0' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Content */}
        <div className="checkout-content">
          {/* Vehicle Plate Card */}
          <div className="checkout-vehicle-card">
            <div className="cv-left">
              <div className="license-plate big">
                <span className="plate-band">IND</span>
                <span className="plate-text">{vehicle.plate}</span>
              </div>
              <div className="cv-sub">
                <span className="badge-pill">Bay {slot.id}</span>
                <span className="badge-pill zone-badge">Zone {slot.zone}</span>
                <span className="badge-pill type-pill">{vehicleTypeInfo.icon} {(vehicleTypeInfo.label || 'Car').split('/')[0]}</span>
              </div>
            </div>
            <div className="cv-right">
              <div className="driver-detail">
                <span className="d-label">Driver</span>
                <span className="d-val">{vehicle.driver}</span>
              </div>
              {vehicle.phone && vehicle.phone !== 'N/A' && (
                <div className="driver-detail">
                  <span className="d-label">Phone</span>
                  <span className="d-val">{vehicle.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Time & Duration Details */}
          <div className="time-breakdown-card">
            <div className="time-col">
              <span className="time-label">Entry Time</span>
              <span className="time-value">
                {new Date(entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="time-divider-arrow">➔</div>
            <div className="time-col">
              <span className="time-label">Exit Time</span>
              <span className="time-value">
                {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="time-divider-arrow">➔</div>
            <div className="time-col highlight">
              <span className="time-label">Elapsed Time</span>
              <span className="time-value">{hours}h {minutes}m</span>
              <span className="time-sub">({billedHours} hr billed)</span>
            </div>
          </div>

          {/* Itemized Invoice Breakdown */}
          <div className="bill-breakdown">
            <div className="bill-row">
              <span>Parking Duration ({billedHours} hr @ ₹{ratePerHour}/hr)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="bill-row">
              <span>Municipal Parking GST / Tax (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="bill-total-row">
              <span className="total-label">Total Parking Tariff</span>
              <span className="total-amount">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Ownership warning if user is not the driver */}
          {!isOwner && (
            <div className="modal-error-banner" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#F59E0B' }}>
              <span>🔒 You are viewing an active parking session. Only the verified driver ({vehicle.plate}) can conclude this session and release the bay.</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={() => { playSound('click'); onClose(); }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-pay-checkout" 
              onClick={handleCheckout}
              disabled={loading || !isOwner}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{loading ? 'Processing...' : `Conclude & Release Bay ${slot.id}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
