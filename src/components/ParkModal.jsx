import React, { useState, useEffect } from 'react';
import { VEHICLE_TYPES } from '../utils/parkingData';
import { playSound } from '../utils/sound';

export default function ParkModal({ isOpen, onClose, targetSlot, availableSlots, onParkConfirm }) {
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleType, setVehicleType] = useState('compact');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(60);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (targetSlot) {
        setSelectedSlotId(targetSlot.id);
        setVehicleType(targetSlot.type || 'compact');
      } else if (availableSlots.length > 0) {
        setSelectedSlotId(availableSlots[0].id);
        setVehicleType(availableSlots[0].type || 'compact');
      }
      setPlateNumber('');
      setDriverName('');
      setPhoneNumber('');
      setError('');
    }
  }, [isOpen, targetSlot, availableSlots]);

  if (!isOpen) return null;

  const currentSlot = availableSlots.find(s => s.id === selectedSlotId) || targetSlot;
  const currentRate = VEHICLE_TYPES[vehicleType]?.baseRate || 5;

  const handleRandomPlate = () => {
    playSound('click');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const states = ['NY', 'CA', 'TX', 'MH', 'KA', 'DL', 'FL'];
    const state = states[Math.floor(Math.random() * states.length)];
    const nums1 = Math.floor(10 + Math.random() * 89);
    const char1 = letters[Math.floor(Math.random() * letters.length)];
    const char2 = letters[Math.floor(Math.random() * letters.length)];
    const nums2 = Math.floor(1000 + Math.random() * 9000);
    setPlateNumber(`${state}-${nums1}-${char1}${char2}-${nums2}`);
    if (!driverName) {
      const names = ['Alex Mercer', 'Sophia Chen', 'Liam Vance', 'Olivia Taylor', 'Noah Wilson'];
      setDriverName(names[Math.floor(Math.random() * names.length)]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setError('Please select an available parking slot.');
      return;
    }
    if (!plateNumber.trim()) {
      setError('Please enter a vehicle license plate number.');
      return;
    }

    const vehicleData = {
      plate: plateNumber.trim().toUpperCase(),
      driver: driverName.trim() || 'Guest Driver',
      type: vehicleType,
      phone: phoneNumber.trim() || 'N/A',
      parkedAt: Date.now(),
      batteryLevel: vehicleType === 'ev' ? batteryLevel : null,
    };

    playSound('park');
    onParkConfirm(selectedSlotId, vehicleData);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box park-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge park">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div>
              <h2 className="modal-title">Park Vehicle (Check-In)</h2>
              <p className="modal-subtitle">Assign bay and issue digital entry token</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }}>✕</button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Slot Selection */}
          <div className="form-group">
            <label className="form-label">
              <span>Select Parking Bay</span>
              <span className="label-hint">Available: {availableSlots.length}</span>
            </label>
            <select
              className="form-select"
              value={selectedSlotId}
              onChange={(e) => {
                const sId = e.target.value;
                setSelectedSlotId(sId);
                const s = availableSlots.find(slot => slot.id === sId);
                if (s) setVehicleType(s.type);
              }}
            >
              {availableSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  Bay {s.id} (Zone {s.zone} - {VEICLE_LABEL(s.type)})
                </option>
              ))}
            </select>
          </div>

          {/* License Plate Number */}
          <div className="form-group">
            <div className="label-with-action">
              <label className="form-label">Vehicle License Plate</label>
              <button 
                type="button" 
                className="random-generator-btn"
                onClick={handleRandomPlate}
              >
                🎲 Random Generator
              </button>
            </div>
            <div className="plate-input-container">
              <span className="plate-badge-side">PLATE</span>
              <input
                type="text"
                className="form-input uppercase-text plate-input"
                placeholder="e.g. NY-482-KXZ"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
          </div>

          {/* Vehicle Type Selector */}
          <div className="form-group">
            <label className="form-label">Vehicle Category</label>
            <div className="vehicle-type-selector-grid">
              {Object.entries(VEHICLE_TYPES).map(([key, info]) => (
                <button
                  type="button"
                  key={key}
                  className={`vehicle-type-card ${vehicleType === key ? 'selected' : ''}`}
                  onClick={() => { playSound('click'); setVehicleType(key); }}
                >
                  <span className="v-icon">{info.icon}</span>
                  <span className="v-label">{info.label}</span>
                  <span className="v-rate">${info.baseRate}/hr</span>
                </button>
              ))}
            </div>
          </div>

          {/* Driver Name & Phone (Optional) */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Driver Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. John Doe"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number (Optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +1 555-0199"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {/* If EV type, Battery Slider */}
          {vehicleType === 'ev' && (
            <div className="form-group ev-battery-box">
              <label className="form-label">
                <span>Initial Battery Charge: {batteryLevel}%</span>
                <span className="charge-indicator">⚡ Supercharger Connected</span>
              </label>
              <input
                type="range"
                min="10"
                max="95"
                value={batteryLevel}
                onChange={(e) => setBatteryLevel(Number(e.target.value))}
                className="range-slider"
              />
            </div>
          )}

          {/* Pricing Summary */}
          <div className="pricing-summary-box">
            <div className="rate-line">
              <span>Standard Hourly Rate:</span>
              <span className="rate-val">${currentRate}.00 / hour</span>
            </div>
            <div className="rate-note">
              * Billing starts immediately upon entry. Digital receipt generated on exit.
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={() => { playSound('click'); onClose(); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-confirm-park">
              Confirm & Issue Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VEICLE_LABEL(type) {
  const map = {
    compact: 'Compact',
    suv: 'SUV',
    ev: 'EV Supercharger',
    bike: 'Motorcycle',
    vip: 'VIP Prime',
  };
  return map[type] || 'Standard';
}
