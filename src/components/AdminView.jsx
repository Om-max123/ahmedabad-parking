import React, { useState, useEffect, useCallback } from 'react';
import { playSound } from '../utils/sound';

export default function AdminView({
  currentUser,
  authToken,
  onRoleChanged,
  showToast,
  onRefreshData,
}) {
  const [overview, setOverview] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add location form
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocArea, setNewLocArea] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocLat, setNewLocLat] = useState('23.0300');
  const [newLocLng, setNewLocLng] = useState('72.5500');
  const [newLocRate, setNewLocRate] = useState('35');
  const [savingLoc, setSavingLoc] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';

  const fetchAdminData = useCallback(async () => {
    if (!authToken || !isAdmin) return;
    setLoading(true);
    setError('');

    try {
      const [overRes, bkRes] = await Promise.all([
        fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`/api/admin/bookings?status=${statusFilter}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (overRes.ok) {
        const oData = await overRes.json();
        setOverview(oData);
      }
      if (bkRes.ok) {
        const bData = await bkRes.json();
        setBookings(bData);
      }
    } catch {
      setError('Failed to fetch admin data.');
    } finally {
      setLoading(false);
    }
  }, [authToken, isAdmin, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin, fetchAdminData]);

  // Toggle user role between 'admin' and 'driver'
  const handleToggleRole = async () => {
    try {
      const res = await fetch('/api/admin/toggle-my-role', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        playSound('park');
        if (onRoleChanged) {
          onRoleChanged(data.role, data.token);
        }
        if (showToast) {
          showToast(`Account role switched to: ${data.role.toUpperCase()}`, 'info');
        }
      }
    } catch {
      if (showToast) showToast('Failed to switch role', 'warning');
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    setSavingLoc(true);
    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: newLocName.trim(),
          area: newLocArea.trim(),
          address: newLocAddress.trim() || `${newLocName}, ${newLocArea}, Ahmedabad`,
          lat: parseFloat(newLocLat),
          lng: parseFloat(newLocLng),
          hourlyRate: parseFloat(newLocRate),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add location');

      playSound('park');
      if (showToast) showToast(data.message || 'Location created!', 'success');
      setShowAddLoc(false);
      setNewLocName('');
      setNewLocArea('');
      setNewLocAddress('');
      fetchAdminData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLoc(false);
    }
  };

  return (
    <div className="admin-view-wrapper" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner & Role Switcher */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#FBBF24',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '22px'
          }}>
            🛡️
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#F8FAFC' }}>
              Municipal Traffic Command & Administration
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              Restricted to authorized Ahmedabad Municipal Corporation (AMC) operators. Server-enforced RBAC.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#CBD5E1' }}>
            Current Role: <strong style={{ color: isAdmin ? '#FBBF24' : '#60A5FA' }}>{currentUser?.role?.toUpperCase() || 'DRIVER'}</strong>
          </span>
          <button
            type="button"
            className="action-pill-btn secondary"
            onClick={handleToggleRole}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {isAdmin ? 'Switch to Driver Role' : 'Promote to Admin (Testing)'}
          </button>
        </div>
      </div>

      {!isAdmin ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '12px',
          border: '1px dashed rgba(239, 68, 68, 0.4)'
        }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>⛔</span>
          <h3 style={{ color: '#F87171', marginBottom: '8px' }}>Access Restricted (HTTP 403 Forbidden)</h3>
          <p style={{ color: '#94A3B8', maxWidth: '480px', margin: '0 auto 18px', fontSize: '13px' }}>
            Your account is currently registered as a standard <code>driver</code>. Click <strong>"Promote to Admin (Testing)"</strong> above to test server-verified municipal management features.
          </p>
          <button type="button" className="action-pill-btn primary" onClick={handleToggleRole}>
            Promote to Admin Role Now
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div className="modal-error-banner" style={{ marginBottom: '16px' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Overview Cards */}
          {overview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Total Facilities</span>
                <strong style={{ fontSize: '24px', color: '#F8FAFC' }}>{overview.locationsCount} Hubs</strong>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Available Spots</span>
                <strong style={{ fontSize: '24px', color: '#34D399' }}>{overview.slots?.available || 0} Free</strong>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Active Bookings</span>
                <strong style={{ fontSize: '24px', color: '#FBBF24' }}>{overview.bookings?.active || 0} Sessions</strong>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Total Ledger Volume</span>
                <strong style={{ fontSize: '24px', color: '#60A5FA' }}>₹{overview.totalRevenue?.toFixed(0) || 0}</strong>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Bookings
              </button>
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </button>
              <button
                type="button"
                className={`segmented-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                Cancelled / Refunded
              </button>
            </div>

            <button
              type="button"
              className="action-pill-btn primary"
              onClick={() => setShowAddLoc(!showAddLoc)}
              style={{ background: '#2563EB', color: '#FFF' }}
            >
              {showAddLoc ? '✕ Cancel' : '+ Add Municipal Location'}
            </button>
          </div>

          {/* Add Municipal Location Form Drawer */}
          {showAddLoc && (
            <form onSubmit={handleAddLocation} style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 16px', color: '#F8FAFC' }}>Register New Municipal Parking Hub in PostgreSQL</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Facility Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bopal Commercial Plaza Parking"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Area / Neighborhood</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bopal, Satellite, Naranpura"
                    value={newLocArea}
                    onChange={(e) => setNewLocArea(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Near SP Ring Road Cross Roads, Bopal, Ahmedabad - 380058"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={newLocLat}
                    onChange={(e) => setNewLocLat(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={newLocLng}
                    onChange={(e) => setNewLocLng(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Hourly Tariff (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newLocRate}
                    onChange={(e) => setNewLocRate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddLoc(false)}>Cancel</button>
                <button type="submit" className="btn-confirm-park" disabled={savingLoc}>
                  {savingLoc ? 'Inserting into PostgreSQL...' : 'Commit Location & Seed Bays'}
                </button>
              </div>
            </form>
          )}

          {/* Bookings Ledger Table */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#F8FAFC', fontSize: '14px' }}>City-Wide Bookings Audit Trail ({bookings.length})</strong>
              <button type="button" className="btn-text-action" onClick={fetchAdminData}>↻ Refresh</button>
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>Loading bookings audit trail...</div>
            ) : bookings.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>No bookings matching current filter.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 41, 59, 0.6)', color: '#94A3B8' }}>
                      <th style={{ padding: '10px 14px' }}>Booking ID</th>
                      <th style={{ padding: '10px 14px' }}>Plate & Driver</th>
                      <th style={{ padding: '10px 14px' }}>Facility</th>
                      <th style={{ padding: '10px 14px' }}>Slot</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Created (IST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.booking_id} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#60A5FA' }}>{b.booking_id}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <strong style={{ color: '#F8FAFC' }}>{b.plate}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8' }}>{b.driver_name}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#CBD5E1' }}>{b.location_name || b.location_id}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: '#1E293B', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            {b.slot_id}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: b.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : b.status === 'completed' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: b.status === 'active' ? '#34D399' : b.status === 'completed' ? '#60A5FA' : '#F87171'
                          }}>
                            {b.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94A3B8', fontSize: '12px' }}>
                          {new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

