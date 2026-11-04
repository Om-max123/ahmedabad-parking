import React, { useState, useEffect } from 'react';
import { VEHICLE_TYPES } from '../utils/parkingData';

export default function ParkingSlotCard({ 
  slot, 
  hourlyRate = 30, 
  currency = '₹', 
  currentUser,
  onSelectAvailable, 
  onSelectOccupied 
}) {
  const [elapsedText, setElapsedText] = useState('');
  const [accruedFee, setAccruedFee] = useState(0);

  const vehicleTypeInfo = VEHICLE_TYPES[slot.type] || VEHICLE_TYPES.compact;

  useEffect(() => {
    if (slot.status !== 'occupied' || !slot.vehicle) return;

    const updateTimeAndFee = () => {
      const now = Date.now();
      const parkedAt = slot.vehicle.parkedAt || now;
      const diffMs = Math.max(0, now - parkedAt);
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      if (hours > 0) {
        setElapsedText(`${hours}h ${mins}m`);
      } else {
        setElapsedText(`${mins}m`);
      }

      // Calculate fee: minimum 1 hour, billed hourly
      const ratePerHour = hourlyRate || vehicleTypeInfo.baseRate || 30;
      const dynamicFactor = slot.sensor?.dynamicPricing || 1.0;
      const billedHours = Math.max(1, Math.ceil(diffMins / 60));
      setAccruedFee(Math.round(billedHours * ratePerHour * dynamicFactor));
    };

    updateTimeAndFee();
    const interval = setInterval(updateTimeAndFee, 30000);
    return () => clearInterval(interval);
  }, [slot, vehicleTypeInfo, hourlyRate]);

  const isOccupied = slot.status === 'occupied' && slot.vehicle;
  const isMyVehicle = isOccupied && currentUser && (
    (slot.vehicle.plate && slot.vehicle.plate === currentUser.carNumber) ||
    currentUser.role === 'admin'
  );

  const handleClick = () => {
    if (isOccupied) {
      if (isMyVehicle) {
        onSelectOccupied(slot);
      }
    } else {
      onSelectAvailable(slot);
    }
  };

  return (
    <div 
      className={`parking-bay-card ${isOccupied ? (isMyVehicle ? 'bay-occupied bay-mine' : 'bay-occupied') : 'bay-available'} zone-${(slot.zone || 'A').toLowerCase()}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-label={`Parking Bay ${slot.id}, Zone ${slot.zone}, ${isOccupied ? (isMyVehicle ? 'Occupied by your vehicle ' + slot.vehicle.plate : 'Occupied by ' + slot.vehicle.plate) : 'Available'}`}
    >
      <div className="bay-card-inner">
        {/* Header: Slot Code & Vehicle Type Badge */}
        <div className="bay-header">
          <div className="slot-id-badge">
            <span className="zone-letter">{slot.zone}</span>
            <span className="slot-num">{slot.id}</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {isMyVehicle && (
              <span className="badge-pill" style={{ background: '#0071E3', color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}>
                Your Pass
              </span>
            )}
            <div className="bay-type-tag">
              <span className="type-icon">{vehicleTypeInfo.icon}</span>
              <span className="type-label">{(vehicleTypeInfo.label || 'Car').split('/')[0]}</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        {isOccupied ? (
          <div className="bay-occupied-body">
            {/* Indian High-Security Registration Plate (HSRP) */}
            <div className="license-plate">
              <div className="plate-band">IND</div>
              <span className="plate-text">{slot.vehicle.plate}</span>
            </div>

            {/* Vehicle & Driver Meta */}
            <div className="driver-meta">
              <span className="driver-name" title={slot.vehicle.driver || 'Registered Driver'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {isMyVehicle ? 'You' : (slot.vehicle.driver || 'Registered Driver')}
              </span>

              <span className="parked-duration" title="Duration parked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {elapsedText || 'Just entered'}
              </span>
            </div>

            {/* EV Charging Status Indicator */}
            {slot.type === 'ev' && (
              <div className="ev-charging-status">
                <div className="battery-meter" title="EV State of Charge">
                  <div 
                    className="battery-level" 
                    style={{ width: `${slot.vehicle.batteryLevel || 85}%` }}
                  ></div>
                </div>
                <span className="ev-charging-text">
                  ⚡ {slot.vehicle.batteryLevel || 85}% Charged
                </span>
              </div>
            )}

            {/* IoT Sensor Diagnostics */}
            {slot.sensor && (
              <div className="slot-sensor-meta">
                <span className="sensor-pill" title="IoT Ultrasonic Distance">
                  📡 {slot.sensor.ultrasonic ? slot.sensor.ultrasonic.toFixed(0) : 100}cm
                </span>
                <span className="sensor-pill" title="Ground Pressure Sensor">
                  ⚖️ {slot.sensor.pressure ? slot.sensor.pressure.toFixed(1) : 3.0}bar
                </span>
                {slot.sensor.dynamicPricing > 1.0 && (
                  <span className="sensor-pill surge-tag" title="Dynamic Surge Factor">
                    {slot.sensor.dynamicPricing}x Dynamic
                  </span>
                )}
              </div>
            )}

            {/* Accrued Tariff & Exit Button */}
            <div className="bay-footer-occupied">
              <div className="bill-preview">
                <span className="bill-label">Accrued Tariff:</span>
                <span className="bill-amount">{currency}{accruedFee}</span>
              </div>

              {isMyVehicle ? (
                <button 
                  className="checkout-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOccupied(slot);
                  }}
                  title="Conclude your parking session and release this bay"
                >
                  Conclude Session
                </button>
              ) : (
                <span className="occupied-badge-tag" title="This bay is reserved by another driver">
                  🔒 In Use
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bay-available-body">
            <div className="empty-bay-indicator">
              <div className="p-circle-empty">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 18V6h5a3.5 3.5 0 0 1 0 7H8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="available-text">AVAILABLE</span>
              <span className="slot-rate-text">{currency}{hourlyRate} / hour</span>
            </div>

            {/* IoT Sensor Diagnostics */}
            {slot.sensor && (
              <div className="available-sensor-meta">
                <span className="sensor-pill">📡 Cleared ({slot.sensor.ultrasonic ? slot.sensor.ultrasonic.toFixed(0) : 100}cm)</span>
                <span className="sensor-pill">🌡️ {slot.sensor.temperature ? slot.sensor.temperature.toFixed(0) : 28}°C</span>
              </div>
            )}

            <button 
              className="book-bay-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAvailable(slot);
              }}
              title={`Reserve parking bay ${slot.id}`}
            >
              Reserve Bay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
