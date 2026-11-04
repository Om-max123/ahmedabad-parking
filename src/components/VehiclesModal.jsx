import React, { useState, useEffect, useCallback } from 'react';
import { playSound } from '../utils/sound';

export default function VehiclesModal({
  isOpen,
  onClose,
  currentUser,
  authToken,
  onVehicleSelected,
  onOpenLogin,
  showToast,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('compact');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [color, setColor] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vehicles', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      } else {
        setError('Failed to load registered vehicles.');
      }
    } catch {
      setError('Network connection error while fetching vehicles.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsAdding(false);
      fetchVehicles();
    }
  }, [isOpen, fetchVehicles]);

  if (!isOpen) return null;

  // Validate Gujarat Plate
  const validatePlate = (val) => {
    const clean = val.trim().toUpperCase().replace(/\s+/g, '-');
    const plateRegex = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i;
    return plateRegex.test(clean.replace(/-/g, ''));
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    const cleanPlate = plate.trim().toUpperCase().replace(/\s+/g, '-');

    if (!cleanPlate) {
      setError('Please enter a vehicle license plate number.');
      return;
    }
    if (!validatePlate(cleanPlate)) {
      setError('Invalid format. Please enter a valid Indian / Gujarat registration plate (e.g. GJ-01-AB-1234).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          carNumber: cleanPlate,
          vehicleType,
          vehicleMake: vehicleMake.trim(),
          vehicleModel: vehicleModel.trim(),
          color: color.trim(),
          fuelType,
          cityArea: 'Ahmedabad',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register vehicle');
      }

      playSound('park');
      if (showToast) {
        showToast(`Vehicle ${cleanPlate} added to your registry!`, 'success');
      }
      setPlate('');
      setVehicleMake('');
      setVehicleModel('');
      setColor('');
      setIsAdding(false);
      fetchVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (vId, vPlate) => {
    try {
      const res = await fetch(`/api/vehicles/${vId || vPlate}/default`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        playSound('click');
        if (showToast) showToast(`Vehicle ${vPlate} set as default!`, 'success');
        fetchVehicles();
      }
    } catch {
      setError('Failed to set default vehicle.');
    }
  };

  const handleDeleteVehicle = async (vId, vPlate) => {
    if (!window.confirm(`Remove vehicle ${vPlate} from your registry?`)) return;

    try {
      const res = await fetch(`/api/vehicles/${vId || vPlate}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        playSound('click');
        if (showToast) showToast(`Vehicle ${vPlate} removed.`, 'info');
        fetchVehicles();
      }
    } catch {
      setError('Failed to delete vehicle.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="vehicles-modal-title">
      <div className="modal-box vehicles-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                <circle cx="7" cy="17" r="2"></circle>
                <circle cx="17" cy="17" r="2"></circle>
              </svg>
            </div>
            <div>
              <h2 id="vehicles-modal-title" className="modal-title">My Registered Vehicles</h2>
              <p className="modal-subtitle">Ahmedabad Municipal Vehicle Registry & RTO Integration</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }} aria-label="Close modal">✕</button>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert" style={{ margin: '16px 24px 0' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="vehicles-modal-content" style={{ padding: '20px 24px' }}>
          {!currentUser ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <p style={{ color: '#9CA3AF', marginBottom: '16px' }}>Please sign in to manage your registered vehicles.</p>
              <button
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
              {/* Official Verification Notice */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#94A3B8',
                marginBottom: '16px',
                lineHeight: 1.5,
              }}>
                <strong style={{ color: '#E2E8F0', display: 'block', marginBottom: '4px' }}>
                  ℹ️ MoRTH / Gujarat RTO Verification Status Notice
                </strong>
                Direct verification against the National Vahan / Sarathi government registry requires sanctioned API credentials. Vehicles registered below operate in transparent <em>Municipal Demo Mode</em> with FASTag clearance.
              </div>

              {/* Add New Vehicle Button */}
              {!isAdding && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>
                    {vehicles.length} Vehicle{vehicles.length === 1 ? '' : 's'} on file
                  </span>
                  <button
                    type="button"
                    className="action-pill-btn primary"
                    onClick={() => { playSound('click'); setIsAdding(true); }}
                    style={{ padding: '6px 14px', fontSize: '13px', background: '#2563EB', color: '#FFF' }}
                  >
                    + Add New Vehicle
                  </button>
                </div>
              )}

              {/* Add Vehicle Inline Form */}
              {isAdding && (
                <form onSubmit={handleAddVehicle} style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ color: '#F8FAFC', fontSize: '14px' }}>Register New Vehicle</strong>
                    <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>✕</button>
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Gujarat Registration Plate</label>
                    <input
                      type="text"
                      className="form-input uppercase-text"
                      placeholder="e.g. GJ-01-AB-1234"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      required
                    />
                    <span className="field-hint">Format: GJ-01 (Ahmedabad City), GJ-27 (East), GJ-18 (Gandhinagar)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Make & Brand</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Tata, Hyundai, Maruti"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Model</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Nexon, Creta, Swift"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label className="form-label">Vehicle Category</label>
                      <select
                        className="form-input"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                      >
                        <option value="compact">🚗 Compact / Sedan</option>
                        <option value="suv">🚙 SUV / Crossover</option>
                        <option value="ev">⚡ Electric Vehicle (EV)</option>
                        <option value="bike">🏍️ Motorcycle / Two-Wheeler</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Fuel Type</label>
                      <select
                        className="form-input"
                        value={fuelType}
                        onChange={(e) => setFuelType(e.target.value)}
                      >
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Electric">Electric (EV)</option>
                        <option value="CNG">CNG</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-cancel" onClick={() => setIsAdding(false)} disabled={submitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-confirm-park" disabled={submitting}>
                      {submitting ? 'Registering with PostgreSQL...' : 'Save & Register Vehicle'}
                    </button>
                  </div>
                </form>
              )}

              {/* Vehicles List */}
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>Loading vehicles...</div>
              ) : vehicles.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  No vehicles registered yet. Click <strong>+ Add New Vehicle</strong> above to add your Gujarat car or bike.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {vehicles.map((v) => {
                    const isDefault = v.is_default || v.car_number === currentUser.carNumber;
                    const vStatus = v.verification_status || 'pending_official_verification';
                    const isVerified = vStatus === 'verified' || vStatus === 'municipal_demo_verified';

                    return (
                      <div
                        key={v.id || v.car_number}
                        style={{
                          background: isDefault ? 'rgba(37, 99, 235, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                          border: isDefault ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(148, 163, 184, 0.1)',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              fontSize: '15px',
                              letterSpacing: '1px',
                              color: '#F8FAFC',
                              background: '#0F172A',
                              border: '1px solid #334155',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}>
                              {v.car_number}
                            </span>
                            {isDefault && (
                              <span style={{
                                fontSize: '11px',
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#60A5FA',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                DEFAULT
                              </span>
                            )}
                            <span style={{
                              fontSize: '11px',
                              background: isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isVerified ? '#34D399' : '#FBBF24',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '500'
                            }}>
                              {isVerified ? '✓ Municipal Verified' : '⚠️ Pending RTO Verification'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                            {v.vehicle_make ? `${v.vehicle_make} ${v.vehicle_model || ''}` : 'Vehicle'} • {v.vehicle_type || 'Car'} • {v.fuel_type || 'Fuel'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!isDefault && (
                            <button
                              type="button"
                              className="btn-text-action"
                              style={{ fontSize: '12px', color: '#60A5FA' }}
                              onClick={() => handleSetDefault(v.id, v.car_number)}
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-text-action"
                            style={{ fontSize: '12px', color: '#F87171' }}
                            onClick={() => handleDeleteVehicle(v.id, v.car_number)}
                            title="Remove Vehicle"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

