import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';

const AHMEDABAD_AREAS = [
  'Navrangpura',
  'Vastrapur',
  'Bodakdev',
  'Prahlad Nagar',
  'Satellite',
  'SG Highway',
  'Ellisbridge',
  'Riverfront West',
  'Maninagar',
  'Khadia (Old City)',
  'Thaltej',
  'Gota',
];

const VEHICLE_MAKES = [
  'Tata',
  'Hyundai',
  'Maruti Suzuki',
  'Mahindra',
  'Honda',
  'Toyota',
  'MG',
  'Kia',
  'Volkswagen',
  'Skoda',
  'Ola Electric',
  'Ather',
];

const PRESETS = [
  {
    ownerName: 'Karan Patel',
    phone: '9876543210',
    email: 'karan.patel@ahmedabad.in',
    carNumber: 'GJ-01-AB-1234',
    vehicleMake: 'Honda',
    vehicleModel: 'City ZX',
    vehicleType: 'sedan',
    color: 'Pearl White',
    fuelType: 'Petrol',
    passType: 'Resident Smart Pass',
    cityArea: 'Navrangpura',
  },
  {
    ownerName: 'Diya Mehta',
    phone: '9825123456',
    email: 'diya.ev@tatamotors.com',
    carNumber: 'GJ-01-EV-3399',
    vehicleMake: 'Tata',
    vehicleModel: 'Nexon EV Max',
    vehicleType: 'ev',
    color: 'Intense Teal',
    fuelType: 'Electric',
    passType: 'Green EV Pass',
    cityArea: 'Bodakdev',
  },
  {
    ownerName: 'Aarav Shah',
    phone: '9898011223',
    email: 'aarav.shah@venture.com',
    carNumber: 'GJ-27-AM-8811',
    vehicleMake: 'Hyundai',
    vehicleModel: 'Creta SX(O)',
    vehicleType: 'suv',
    color: 'Phantom Black',
    fuelType: 'Diesel',
    passType: 'Corporate VIP Pass',
    cityArea: 'Vastrapur',
  },
  {
    ownerName: 'Vikram Desai',
    phone: '9712399887',
    email: 'vikram.desai@corporate.in',
    carNumber: 'GJ-18-BQ-4050',
    vehicleMake: 'Mahindra',
    vehicleModel: 'XUV700 AX7',
    vehicleType: 'suv',
    color: 'Midnight Black',
    fuelType: 'Diesel',
    passType: 'Corporate VIP Pass',
    cityArea: 'Prahlad Nagar',
  },
];

export default function VehicleOwnerModal({
  isOpen,
  onClose,
  initialData = null,
  onSuccess,
}) {
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('Tata');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState('sedan');
  const [color, setColor] = useState('Pearl White');
  const [fuelType, setFuelType] = useState('Petrol');
  const [fastagId, setFastagId] = useState('');
  const [passType, setPassType] = useState('Daily Pass');
  const [cityArea, setCityArea] = useState('Navrangpura');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      setOwnerName(initialData.owner_name || initialData.ownerName || '');
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      setCarNumber(initialData.car_number || initialData.carNumber || '');
      setVehicleMake(initialData.vehicle_make || initialData.vehicleMake || 'Tata');
      setVehicleModel(initialData.vehicle_model || initialData.vehicleModel || '');
      setVehicleType(initialData.vehicle_type || initialData.vehicleType || 'sedan');
      setColor(initialData.color || 'Pearl White');
      setFuelType(initialData.fuel_type || initialData.fuelType || 'Petrol');
      setFastagId(initialData.fastag_id || initialData.fastagId || '');
      setPassType(initialData.pass_type || initialData.passType || 'Daily Pass');
      setCityArea(initialData.city_area || initialData.cityArea || 'Navrangpura');
      setEmergencyPhone(initialData.emergency_phone || initialData.emergencyPhone || '');
    } else {
      // Clear fields for fresh creation
      setOwnerName('');
      setPhone('');
      setEmail('');
      setCarNumber('');
      setVehicleMake('Tata');
      setVehicleModel('');
      setVehicleType('sedan');
      setColor('Pearl White');
      setFuelType('Petrol');
      setFastagId(`FASTAG-IND-${Math.floor(1000000 + Math.random() * 9000000)}`);
      setPassType('Daily Pass');
      setCityArea('Navrangpura');
      setEmergencyPhone('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    playSound('click');
    setOwnerName(preset.ownerName);
    setPhone(preset.phone);
    setEmail(preset.email);
    setCarNumber(preset.carNumber);
    setVehicleMake(preset.vehicleMake);
    setVehicleModel(preset.vehicleModel);
    setVehicleType(preset.vehicleType);
    setColor(preset.color);
    setFuelType(preset.fuelType);
    setPassType(preset.passType);
    setCityArea(preset.cityArea);
    setFastagId(`FASTAG-IND-${Math.floor(1000000 + Math.random() * 9000000)}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      setError('Owner name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Contact phone number is required.');
      return;
    }
    if (!carNumber.trim()) {
      setError('Car / Vehicle plate registration number is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      ownerName: ownerName.trim(),
      phone: phone.trim().replace(/\D/g, ''),
      email: email.trim() || null,
      carNumber: carNumber.trim().toUpperCase(),
      vehicleMake,
      vehicleModel: vehicleModel.trim() || 'Standard Model',
      vehicleType,
      color,
      fuelType,
      fastagId: fastagId || `FASTAG-IND-${Math.floor(1000000 + Math.random() * 9000000)}`,
      passType,
      cityArea,
      emergencyPhone: emergencyPhone.trim() || null,
    };

    try {
      const url = isEdit ? `/api/vehicle-owners/${initialData.id}` : '/api/vehicle-owners';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save vehicle owner');
      }

      playSound('park');
      if (onSuccess) {
        onSuccess(data.owner || payload, isEdit ? 'updated' : 'created');
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Could not connect to PostgreSQL backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box vehicle-owner-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge owner-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                <circle cx="7" cy="17" r="2"></circle>
                <circle cx="17" cy="17" r="2"></circle>
              </svg>
            </div>
            <div>
              <div className="owner-title-row">
                <h2 className="modal-title">
                  {isEdit ? 'Update Vehicle & Owner Record' : 'Register Vehicle & Car Owner'}
                </h2>
                <span className="live-db-pill-small">PostgreSQL 16 Live</span>
              </div>
              <p className="modal-subtitle">
                Persists directly to PostgreSQL table <code className="code-tag">public.vehicle_owners</code> and reflects in pgAdmin
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }}>✕</button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        {/* Quick Sample Presets Bar */}
        {!isEdit && (
          <div className="preset-selector-bar">
            <span className="preset-label">⚡ Fast Fill Gujarat Preset:</span>
            <div className="preset-chips-wrap">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="preset-chip"
                  onClick={() => handleApplyPreset(p)}
                >
                  <span>{p.vehicleType === 'ev' ? '⚡' : '🚗'}</span>
                  <span>{p.vehicleMake} {p.vehicleModel}</span>
                  <small>({p.carNumber})</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="owner-form-body">
          {/* Dynamic Live Gujarat License Plate Card */}
          <div className="live-plate-preview-box">
            <div className="preview-label">LIVE VEHICLE NUMBER PLATE (GUJARAT RTO FORMAT)</div>
            <div className="license-plate-hologram">
              <div className="plate-ind-strip">
                <div className="ind-circle-flag"></div>
                <span className="ind-text">IND</span>
              </div>
              <div className="plate-digits">
                {carNumber.trim() ? carNumber.toUpperCase() : 'GJ-01-AB-1234'}
              </div>
              <div className="plate-state-tag">GUJARAT</div>
            </div>
          </div>

          <div className="form-sections-grid">
            {/* Section 1: Vehicle Details */}
            <div className="form-section-card">
              <h3 className="section-title">
                <span>🚗</span> Vehicle Specifications
              </h3>

              {/* Registration Number */}
              <div className="form-group">
                <label className="form-label">Car / Vehicle Plate Number *</label>
                <div className="plate-input-container">
                  <span className="plate-badge-side">IND</span>
                  <input
                    type="text"
                    className="form-input plate-input uppercase-text"
                    placeholder="GJ-01-AB-1234"
                    value={carNumber}
                    onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <span className="field-hint">e.g. GJ-01 (Ahmedabad City), GJ-27 (Ahmedabad East), GJ-06 (Vadodara)</span>
              </div>

              {/* Vehicle Type Mini Selector */}
              <div className="form-group">
                <label className="form-label">Vehicle Category</label>
                <div className="vehicle-category-grid">
                  {[
                    { id: 'sedan', label: 'Sedan', icon: '🚗' },
                    { id: 'suv', label: 'SUV', icon: '🚙' },
                    { id: 'hatchback', label: 'Hatchback', icon: '🚘' },
                    { id: 'ev', label: 'EV Electric', icon: '⚡' },
                    { id: 'two_wheeler', label: 'Bike / Scooter', icon: '🏍️' },
                  ].map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className={`type-pill-btn ${vehicleType === v.id ? 'active' : ''}`}
                      onClick={() => { playSound('click'); setVehicleType(v.id); }}
                    >
                      <span className="type-icon">{v.icon}</span>
                      <span className="type-name">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Make & Model Row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Brand / Make</label>
                  <select
                    className="form-select"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                  >
                    {VEHICLE_MAKES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Model Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Nexon EV, Creta, City"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                  />
                </div>
              </div>

              {/* Fuel Type & Color Row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Fuel Type</label>
                  <select
                    className="form-select"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric (EV)</option>
                    <option value="CNG">CNG</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Exterior Color</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Pearl White, Silver"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Owner & Driver Profile */}
            <div className="form-section-card">
              <h3 className="section-title">
                <span>👤</span> Owner & Contact Profile
              </h3>

              {/* Owner Full Name */}
              <div className="form-group">
                <label className="form-label">Owner Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rahul B. Patel"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>

              {/* Mobile Phone Number */}
              <div className="form-group">
                <label className="form-label">Mobile Phone Number *</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">+91</span>
                  <input
                    type="tel"
                    className="form-input with-prefix"
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. rahul.patel@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Area / Neighborhood & Pass Type */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Ahmedabad Area</label>
                  <select
                    className="form-select"
                    value={cityArea}
                    onChange={(e) => setCityArea(e.target.value)}
                  >
                    {AHMEDABAD_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parking Pass Category</label>
                  <select
                    className="form-select"
                    value={passType}
                    onChange={(e) => setPassType(e.target.value)}
                  >
                    <option value="Daily Pass">Daily Smart Pass</option>
                    <option value="Resident Smart Pass">Resident Smart Pass</option>
                    <option value="Corporate VIP Pass">Corporate VIP Pass</option>
                    <option value="Green EV Pass">Green EV Smart Pass</option>
                    <option value="Heritage Zone Pass">Heritage Zone Pass</option>
                  </select>
                </div>
              </div>

              {/* FASTag ID & Emergency Contact */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">FASTag / RFID Tag</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="FASTAG-IND-XXXX"
                    value={fastagId}
                    onChange={(e) => setFastagId(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Optional contact"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions-bar">
            <div className="db-sync-notice">
              <span className="dot-pulse-green"></span>
              <span>Syncs to PostgreSQL <strong>public.vehicle_owners</strong> &amp; <strong>public.users</strong></span>
            </div>

            <div className="buttons-group">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => { playSound('click'); onClose(); }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-modal-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-mini"></span>
                    <span>Saving to PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>{isEdit ? 'Update Vehicle Record' : 'Save Vehicle & Owner to PostgreSQL'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
