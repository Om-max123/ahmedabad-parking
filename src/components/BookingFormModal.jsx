import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/sound';

export default function BookingFormModal({
  isOpen,
  onClose,
  location,
  targetSlot,
  currentUser,
  authToken,
  prefillOwner,
  walletBalance = 500,
  onBookingSuccess,
  onOpenLogin,
  onOpenWalletTopup,
  onUserLoggedIn,
  onBalanceUpdated,
}) {
  // Steps: 1 = Driver Auth (only if not logged in), 2 = Select Bay & Pay, 3 = Bay Received Confirmation
  const [step, setStep] = useState(2);
  const [activeToken, setActiveToken] = useState(authToken);

  // Form Fields
  const [slotId, setSlotId] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleType, setVehicleType] = useState('compact');
  const [durationHours, setDurationHours] = useState(2);

  // Step 1: Quick Auth inside modal if not logged in
  const [authPhone, setAuthPhone] = useState('');
  const [authCar, setAuthCar] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Step 2: Wallet Prepayment
  const [currentBal, setCurrentBal] = useState(walletBalance);
  const [payLoading, setPayLoading] = useState(false);
  const [quickTopupLoading, setQuickTopupLoading] = useState(false);

  // Step 3: Booking result
  const [completedBooking, setCompletedBooking] = useState(null);
  const [completedReceipt, setCompletedReceipt] = useState(null);

  const [error, setError] = useState('');

  // Ref to track modal open transitions (prevents background location updates from resetting Step 3)
  const prevOpenRef = useRef(false);

  const availableSlots = (location?.slots || []).filter(s => s.status === 'available');

  useEffect(() => {
    setActiveToken(authToken);
  }, [authToken]);

  // Fetch updated wallet balance
  const refreshWalletBalance = async (tokenToUse) => {
    const t = tokenToUse || activeToken;
    if (!t) return;
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const d = await res.json();
        setCurrentBal(d.balance);
        if (onBalanceUpdated) onBalanceUpdated(d.balance);
      }
    } catch (e) {
      console.warn('Wallet refresh failed:', e);
    }
  };

  // ONLY initialize or reset when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setError('');
      setCompletedBooking(null);
      setCompletedReceipt(null);
      setPayLoading(false);

      // Target slot selection
      if (targetSlot) {
        setSlotId(targetSlot.id);
        setVehicleType(targetSlot.type || 'compact');
      } else if (availableSlots.length > 0) {
        setSlotId(availableSlots[0].id);
        setVehicleType(availableSlots[0].type || 'compact');
      }

      // Check user authentication
      if (currentUser && activeToken) {
        setCarNumber(currentUser.carNumber || '');
        setPhone(currentUser.phone || '');
        setDriverName(currentUser.name || '');
        setVehicleType(currentUser.vehicleType || 'compact');
        refreshWalletBalance(activeToken);
        setStep(2); // Direct online reservation
      } else if (prefillOwner) {
        setCarNumber(prefillOwner.car_number || prefillOwner.carNumber || '');
        setPhone(prefillOwner.phone || '');
        setDriverName(prefillOwner.owner_name || prefillOwner.name || '');
        setVehicleType(prefillOwner.vehicle_type || prefillOwner.vehicleType || 'compact');
        setAuthName(prefillOwner.owner_name || prefillOwner.name || '');
        setAuthPhone(prefillOwner.phone || '');
        setAuthCar(prefillOwner.car_number || prefillOwner.carNumber || '');
        setStep(1);
      } else {
        setCarNumber('');
        setPhone('');
        setDriverName('');
        setStep(1);
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Update target slot if user clicks a slot while modal is open (and not in Step 3)
  useEffect(() => {
    if (isOpen && targetSlot && step !== 3) {
      setSlotId(targetSlot.id);
      setVehicleType(targetSlot.type || 'compact');
    }
  }, [targetSlot, isOpen, step]);

  useEffect(() => {
    if (walletBalance !== undefined && step !== 3) {
      setCurrentBal(walletBalance);
    }
  }, [walletBalance, step]);

  if (!isOpen || !location) return null;

  const hourlyRate = location.hourlyRate || 35;
  const subtotalCost = hourlyRate * durationHours;
  const estimatedTax = Number((subtotalCost * 0.05).toFixed(2));
  const estimatedCost = Number((subtotalCost + estimatedTax).toFixed(2));

  // Step 1: Handle inline Driver Authentication
  const handleQuickLogin = async (e) => {
    e.preventDefault();
    const cleanP = authPhone.trim().replace(/\D/g, '');
    const cleanC = authCar.trim().toUpperCase().replace(/\s+/g, '-');

    if (cleanP.length < 10) {
      setError('Please provide a valid 10-digit Mobile Phone Number.');
      return;
    }
    if (!cleanC) {
      setError('Please provide your Vehicle Registration Plate.');
      return;
    }

    setAuthLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName.trim() || 'Driver',
          phone: cleanP,
          carNumber: cleanC,
          vehicleType: 'compact',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      playSound('click');
      setActiveToken(data.token);
      if (onUserLoggedIn) {
        onUserLoggedIn(data.user, data.token);
      }
      setCarNumber(data.user.carNumber);
      setPhone(data.user.phone);
      setDriverName(data.user.name);
      setVehicleType(data.user.vehicleType || 'compact');
      setCurrentBal(data.user.walletBalance || 500);

      // Move straight to Bay Selection & Payment
      setStep(2);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const fillSampleDriver = (name, phoneNum, plate) => {
    playSound('click');
    setAuthName(name);
    setAuthPhone(phoneNum);
    setAuthCar(plate);
    setError('');
  };

  // Step 2: Quick Inline Wallet Topup if balance is insufficient
  const handleQuickRecharge = async (addAmount) => {
    if (!activeToken) {
      setError('Authentication token missing. Please sign in again.');
      return;
    }
    setQuickTopupLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          amount: addAmount,
          paymentMethod: 'UPI',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Top-up failed');

      playSound('checkout');
      setCurrentBal(data.newBalance);
      if (onBalanceUpdated) onBalanceUpdated(data.newBalance);
    } catch (err) {
      setError(err.message || 'Quick recharge failed');
    } finally {
      setQuickTopupLoading(false);
    }
  };

  // Step 2: Confirm Prepaid Smart Wallet Booking & Bay Allotment
  const handlePrepayAndPark = async (e) => {
    e.preventDefault();
    if (!slotId) {
      setError('Please choose an available parking bay.');
      return;
    }
    if (!activeToken) {
      setError('Authentication required. Please sign in first.');
      setStep(1);
      return;
    }

    setPayLoading(true);
    setError('');

    const idempotencyKey = `IDEM-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const res = await fetch('/api/bookings/prepay-and-park', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          locationId: location.id,
          slotId,
          durationHours: Number(durationHours),
          gateId: 'Fast-Track Digital Barrier Gate A1',
          arrivalToken: `FASTag-Clearance-${Date.now().toString().slice(-6)}`,
          idempotencyKey
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError(`Insufficient balance (Current: ₹${currentBal.toFixed(2)}, Required: ₹${data.requiredAmount || estimatedCost}). Click a quick recharge button below.`);
          return;
        }
        throw new Error(data.error || 'Booking failed');
      }

      playSound('park');

      // Populate completed booking object
      const confirmedBooking = data.booking || {
        bookingId: data.bookingId,
        slotId,
        locationName: location.name,
        locationArea: location.area,
        plate: carNumber || currentUser?.carNumber,
        driver: driverName || currentUser?.name,
        bookedDurationHours: durationHours,
        prepaidAmount: estimatedCost,
        parkedAt: Date.now(),
        zone: 'A'
      };

      setCompletedBooking(confirmedBooking);
      setCompletedReceipt(data.receipt);
      if (data.remainingBalance !== undefined) {
        setCurrentBal(data.remainingBalance);
        if (onBalanceUpdated) onBalanceUpdated(data.remainingBalance);
      }

      // Transition firmly to Step 3: Bay Received Confirmation
      setStep(3);

      // Notify parent to refresh bookings and locations in background
      if (onBookingSuccess) {
        onBookingSuccess(confirmedBooking, data.slot);
      }
    } catch (err) {
      setError(err.message || 'Payment deduction failed.');
    } finally {
      setPayLoading(false);
    }
  };

  const displayBooking = completedBooking || {
    slotId,
    locationName: location.name,
    locationArea: location.area,
    plate: carNumber || currentUser?.carNumber,
    driver: driverName || currentUser?.name,
    bookedDurationHours: durationHours,
    prepaidAmount: estimatedCost,
    bookingId: 'BK-CONFIRMED',
    parkedAt: Date.now(),
    zone: 'A'
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="booking-wizard-title">
      <div className="modal-box standard-parking-wizard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge book-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <h2 id="booking-wizard-title" className="modal-title">
                {step === 3 ? '🎉 Parking Bay Received!' : 'Ahmedabad Parking Reservation'}
              </h2>
              <p className="modal-subtitle">{location.name} • {location.area}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }} aria-label="Close modal">✕</button>
        </div>

        {/* 3-Step Flow Indicator */}
        <div className="wizard-stepper" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className={`step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-num">{step > 1 ? '✓' : '1'}</span>
            <span className="step-label">Driver Profile</span>
          </div>
          <div className={`step-connector ${step > 1 ? 'active' : ''}`}></div>
          <div className={`step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-num">{step > 2 ? '✓' : '2'}</span>
            <span className="step-label">Reserve & Pay</span>
          </div>
          <div className={`step-connector ${step > 2 ? 'active' : ''}`}></div>
          <div className={`step-node ${step === 3 ? 'active' : ''}`}>
            <span className="step-num">{step === 3 ? '🟢' : '3'}</span>
            <span className="step-label">Bay Received</span>
          </div>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert" style={{ margin: '16px 24px 0' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* STEP 1: DRIVER AUTHENTICATION (Only if not logged in) */}
        {step === 1 && (
          <div className="wizard-step-content">
            <div className="step-instruction-box">
              <div className="instruction-icon">🔐</div>
              <div className="instruction-text">
                <strong>Driver Identity & Gujarat Vehicle Registration</strong>
                <p>Sign in with your Gujarat vehicle registration plate to reserve this bay in the municipal system.</p>
              </div>
            </div>

            <form onSubmit={handleQuickLogin} className="wizard-form-box">
              <div className="form-group">
                <label className="form-label">Driver / Citizen Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Pratik Patel"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit Mobile"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Registration Plate</label>
                  <input
                    type="text"
                    className="form-input uppercase-text"
                    placeholder="e.g. GJ-01-PT-4567"
                    value={authCar}
                    onChange={(e) => setAuthCar(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              {/* Sample Profile Pills for 1-Click Convenience */}
              <div className="sample-profiles-wrap">
                <span className="sample-label">1-Click Test Profile:</span>
                <button
                  type="button"
                  className="sample-pill-btn"
                  onClick={() => fillSampleDriver('Pratik Patel', '9898012345', 'GJ-01-PT-4567')}
                >
                  ⚡ Pratik (GJ-01-PT-4567)
                </button>
                <button
                  type="button"
                  className="sample-pill-btn"
                  onClick={() => fillSampleDriver('Pooja Shah', '9825012345', 'GJ-01-EV-9999')}
                >
                  ⚡ Pooja (GJ-01-EV-9999)
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm-park" disabled={authLoading}>
                  {authLoading ? 'Verifying...' : 'Sign In & Select Bay →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: RESERVE BAY & PREPAY */}
        {step === 2 && (
          <div className="wizard-step-content">
            {/* Authenticated Driver Pill */}
            <div className="verified-driver-pill" style={{ marginBottom: '16px' }}>
              <span className="check-icon">✓</span>
              <span>Driver: <strong>{driverName || currentUser?.name}</strong></span>
              <span className="bullet-sep">•</span>
              <span className="plate-tag">{carNumber || currentUser?.carNumber}</span>
              <span className="bullet-sep">•</span>
              <span>Wallet: <strong>₹{Number(currentBal).toFixed(2)}</strong></span>
            </div>

            <form onSubmit={handlePrepayAndPark} className="wizard-form-box">
              {/* Slot & Duration Selectors */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Select Parking Bay</label>
                  <select
                    className="form-select"
                    value={slotId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      setSlotId(sId);
                      const s = availableSlots.find(slot => slot.id === sId);
                      if (s) setVehicleType(s.type);
                    }}
                    required
                  >
                    {availableSlots.length === 0 ? (
                      <option value="">No bays currently available at this location</option>
                    ) : (
                      availableSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          Bay {s.id} (Zone {s.zone} • {s.type.toUpperCase()})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Parking Duration</label>
                  <select
                    className="form-select"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                  >
                    <option value={1}>1 Hour (₹{(hourlyRate * 1 * 1.05).toFixed(2)})</option>
                    <option value={2}>2 Hours (₹{(hourlyRate * 2 * 1.05).toFixed(2)})</option>
                    <option value={4}>4 Hours (₹{(hourlyRate * 4 * 1.05).toFixed(2)})</option>
                    <option value={8}>8 Hours (₹{(hourlyRate * 8 * 1.05).toFixed(2)})</option>
                    <option value={12}>Full Day 12 Hours (₹{(hourlyRate * 12 * 1.05).toFixed(2)})</option>
                  </select>
                </div>
              </div>

              {/* Instant Online Reservation Notice */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                color: '#D1FAE5'
              }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <div>
                  <strong>Instant Municipal Allotment:</strong> Once reserved, Bay {slotId || 'selected'} is allotted to your vehicle immediately in PostgreSQL and displayed out on your webpage dashboard.
                </div>
              </div>

              {/* Wallet Balance vs Tariff Card */}
              <div className={`wallet-deduction-card ${currentBal < estimatedCost ? 'insufficient' : 'sufficient'}`}>
                <div className="deduction-row">
                  <span>Tariff ({durationHours} hr @ ₹{hourlyRate}/hr + 5% GST)</span>
                  <strong className="tariff-figure">₹{estimatedCost.toFixed(2)}</strong>
                </div>
                <div className="deduction-row">
                  <span>Available Smart Wallet Balance</span>
                  <strong className="balance-figure">₹{Number(currentBal).toFixed(2)}</strong>
                </div>
                <div className="cost-divider"></div>
                <div className="deduction-row total-bold">
                  <span>Remaining Wallet Balance</span>
                  <span className={`net-balance ${currentBal >= estimatedCost ? 'positive' : 'negative'}`}>
                    ₹{(currentBal - estimatedCost).toFixed(2)}
                  </span>
                </div>

                {/* If Balance is Insufficient: Show Quick Top-up Prompt */}
                {currentBal < estimatedCost && (
                  <div className="insufficient-topup-section">
                    <div className="insufficient-warning">
                      ⚠️ Insufficient balance to pay ₹{estimatedCost.toFixed(2)}. Quick 1-click test recharge:
                    </div>
                    <div className="quick-recharge-row">
                      <button
                        type="button"
                        className="quick-recharge-btn"
                        onClick={() => handleQuickRecharge(100)}
                        disabled={quickTopupLoading}
                      >
                        + ₹100
                      </button>
                      <button
                        type="button"
                        className="quick-recharge-btn"
                        onClick={() => handleQuickRecharge(200)}
                        disabled={quickTopupLoading}
                      >
                        + ₹200
                      </button>
                      <button
                        type="button"
                        className="quick-recharge-btn"
                        onClick={() => handleQuickRecharge(500)}
                        disabled={quickTopupLoading}
                      >
                        + ₹500
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm-park"
                  disabled={payLoading || quickTopupLoading || currentBal < estimatedCost || availableSlots.length === 0}
                >
                  {payLoading ? (
                    'Executing ACID Transaction in PostgreSQL...'
                  ) : currentBal < estimatedCost ? (
                    'Recharge Wallet Above to Reserve'
                  ) : (
                    `💳 Pay ₹${estimatedCost.toFixed(2)} & Receive Bay ${slotId || ''}`
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: BAY RECEIVED CONFIRMATION & OUT TO WEBPAGE */}
        {step === 3 && (
          <div className="wizard-step-content pass-screen">
            <div className="barrier-opened-banner" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))', borderColor: '#10B981', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <span className="barrier-icon" style={{ fontSize: '36px' }}>🎉</span>
              <div className="barrier-title-text">
                <div className="barrier-title" style={{ color: '#10B981', fontSize: '19px', fontWeight: '800' }}>
                  Bay {displayBooking.slotId} Received & Allotted!
                </div>
                <div className="barrier-subtitle" style={{ color: '#E5E7EB', fontSize: '13px', marginTop: '2px' }}>
                  Your spot is locked at {location.name}. Active pass is now live on your dashboard.
                </div>
              </div>
            </div>

            {/* Digital Parking Pass Card */}
            <div className="digital-parking-permit-card">
              <div className="permit-header">
                <div className="permit-logo">
                  <span>AMC SMART MOBILITY PERMIT</span>
                </div>
                <div className="permit-stamp">ACTIVE • PAID</div>
              </div>

              <div className="permit-body">
                <div className="permit-bay-highlight">
                  <span className="bay-lead">ALLOTTED PARKING BAY</span>
                  <div className="bay-code-large">Bay {displayBooking.slotId}</div>
                  <div className="bay-meta">Zone {displayBooking.zone || 'A'} • {location.name} ({location.area})</div>
                </div>

                <div className="permit-details-grid">
                  <div className="permit-field">
                    <span className="f-label">VEHICLE PLATE</span>
                    <span className="f-val plate-tag">{displayBooking.plate}</span>
                  </div>
                  <div className="permit-field">
                    <span className="f-label">DRIVER</span>
                    <span className="f-val">{displayBooking.driver}</span>
                  </div>
                  <div className="permit-field">
                    <span className="f-label">RESERVATION TIME</span>
                    <span className="f-val">
                      {new Date(displayBooking.parkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="permit-field">
                    <span className="f-label">BOOKED DURATION</span>
                    <span className="f-val">{displayBooking.bookedDurationHours} Hours</span>
                  </div>
                  <div className="permit-field">
                    <span className="f-label">PAID FROM WALLET</span>
                    <span className="f-val bold">₹{Number(displayBooking.prepaidAmount).toFixed(2)}</span>
                  </div>
                  <div className="permit-field">
                    <span className="f-label">WALLET BALANCE</span>
                    <span className="f-val">₹{Number(currentBal).toFixed(2)}</span>
                  </div>
                </div>

                <div className="permit-qr-mock">
                  <div className="qr-box">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4-2h2v4h-2v-4zm2 4h2v4h-2v-4zm2 2h2v2h-2v-2z"></path>
                    </svg>
                  </div>
                  <div className="qr-hint">
                    <span>FASTag Gate Barrier Code:</span>
                    <strong>{displayBooking.bookingId}</strong>
                    <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>
                      ✓ Pre-approved for automatic barrier opening
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="primary-cta-btn full-width"
                style={{
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
                onClick={onClose}
              >
                ✓ Done — View Active Bay Out on Webpage →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
