import React, { useState, useEffect, useMemo } from 'react';
import { playSound } from '../utils/sound';

export default function VehicleOwnersView({
  onOpenRegisterModal,
  onEditOwner,
  onQuickReserve,
  onNavigateToDbTable,
  showToast,
}) {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPass, setSelectedPass] = useState('all');
  const [selectedSqlRow, setSelectedSqlRow] = useState(null);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicle-owners');
      if (res.ok) {
        const data = await res.json();
        setOwners(data);
      }
    } catch (err) {
      console.error('Failed to load vehicle owners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleDelete = async (owner) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${owner.car_number} (${owner.owner_name}) from PostgreSQL?`)) {
      return;
    }
    playSound('click');
    try {
      const res = await fetch(`/api/vehicle-owners/${owner.id}`, { method: 'DELETE' });
      if (res.ok) {
        setOwners((prev) => prev.filter((o) => o.id !== owner.id));
        if (showToast) {
          showToast(`Vehicle ${owner.car_number} removed from PostgreSQL`, 'info');
        }
      }
    } catch (err) {
      console.error('Failed to delete vehicle owner:', err);
    }
  };

  // Filter owners
  const filteredOwners = useMemo(() => {
    return owners.filter((o) => {
      // Type filter
      if (selectedType !== 'all') {
        const t = (o.vehicle_type || '').toLowerCase();
        if (t !== selectedType.toLowerCase()) return false;
      }

      // Pass filter
      if (selectedPass !== 'all') {
        const p = (o.pass_type || '').toLowerCase();
        if (!p.includes(selectedPass.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (o.owner_name || '').toLowerCase();
        const plate = (o.car_number || '').toLowerCase();
        const phone = (o.phone || '').toLowerCase();
        const make = (o.vehicle_make || '').toLowerCase();
        const model = (o.vehicle_model || '').toLowerCase();
        const area = (o.city_area || '').toLowerCase();
        if (!name.includes(q) && !plate.includes(q) && !phone.includes(q) && !make.includes(q) && !model.includes(q) && !area.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [owners, selectedType, selectedPass, searchQuery]);

  // Statistics
  const totalCount = owners.length;
  const evCount = owners.filter((o) => (o.vehicle_type || '').toLowerCase() === 'ev' || (o.fuel_type || '').toLowerCase() === 'electric').length;
  const fastagCount = owners.filter((o) => !!o.fastag_id).length;
  const vipCount = owners.filter((o) => (o.pass_type || '').toLowerCase().includes('vip') || (o.pass_type || '').toLowerCase().includes('smart')).length;

  return (
    <div className="vehicle-owners-view-container">
      {/* Top Executive Header Banner */}
      <div className="owners-header-card">
        <div className="owners-header-left">
          <div className="owners-badge-tag">
            <span className="dot-pulse"></span>
            <strong>AHMEDABAD SMART VEHICLE REGISTRY</strong>
          </div>
          <h1 className="owners-main-title">Car &amp; Vehicle Owners Management</h1>
          <p className="owners-tagline">
            PostgreSQL relational model <code className="code-pill">public.vehicle_owners</code> • Real-time synchronization with pgAdmin and parking telemetry
          </p>
        </div>

        <div className="owners-header-actions">
          <button
            className="btn-register-vehicle-hero"
            onClick={() => { playSound('click'); onOpenRegisterModal(); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Register New Vehicle &amp; Owner</span>
          </button>

          <button
            className="btn-view-pgadmin"
            onClick={onNavigateToDbTable}
            title="Inspect table in PostgreSQL Explorer"
          >
            <span>🐘</span>
            <span>View in PostgreSQL Explorer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="owners-kpi-grid">
        <div className="owners-kpi-card">
          <div className="kpi-icon-wrap blue">🚗</div>
          <div className="kpi-info">
            <span className="kpi-number">{totalCount}</span>
            <span className="kpi-label">Registered Vehicles</span>
          </div>
        </div>

        <div className="owners-kpi-card">
          <div className="kpi-icon-wrap green">⚡</div>
          <div className="kpi-info">
            <span className="kpi-number">{evCount}</span>
            <span className="kpi-label">Clean EV Fleet (Green)</span>
          </div>
        </div>

        <div className="owners-kpi-card">
          <div className="kpi-icon-wrap purple">💳</div>
          <div className="kpi-info">
            <span className="kpi-number">{fastagCount}</span>
            <span className="kpi-label">FASTag Enabled Cars</span>
          </div>
        </div>

        <div className="owners-kpi-card">
          <div className="kpi-icon-wrap gold">⭐</div>
          <div className="kpi-info">
            <span className="kpi-number">{vipCount}</span>
            <span className="kpi-label">Smart / VIP Parking Passes</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="owners-toolbar">
        {/* Search Input */}
        <div className="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="owners-search-input"
            placeholder="Search by Plate (e.g. GJ-01), Owner Name, Mobile (+91), Model, or Area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Category Filters */}
        <div className="owners-filter-chips">
          {[
            { id: 'all', label: 'All Vehicles' },
            { id: 'sedan', label: '🚗 Sedans' },
            { id: 'suv', label: '🚙 SUVs' },
            { id: 'ev', label: '⚡ Electric' },
            { id: 'hatchback', label: '🚘 Hatchbacks' },
            { id: 'two_wheeler', label: '🏍️ 2-Wheelers' },
          ].map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${selectedType === f.id ? 'active' : ''}`}
              onClick={() => { playSound('click'); setSelectedType(f.id); }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Pass Filter Dropdown */}
        <div className="pass-filter-dropdown-wrap">
          <select
            className="pass-select"
            value={selectedPass}
            onChange={(e) => setSelectedPass(e.target.value)}
          >
            <option value="all">All Pass Types</option>
            <option value="smart">Smart Passes</option>
            <option value="vip">Corporate VIP</option>
            <option value="green">Green EV Pass</option>
            <option value="daily">Daily Passes</option>
          </select>
        </div>

        <button
          className="btn-refresh-owners"
          onClick={fetchOwners}
          title="Refresh from PostgreSQL"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spin' : ''}>
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>

      {/* Main Grid of Vehicle Owner Cards */}
      {loading ? (
        <div className="owners-loading-state">
          <div className="loading-spinner"></div>
          <span>Querying PostgreSQL database <code className="code-tag">wad_parking.public.vehicle_owners</code>...</span>
        </div>
      ) : filteredOwners.length === 0 ? (
        <div className="owners-empty-state">
          <div className="empty-icon">🚗</div>
          <h3>No Vehicle Owners Found</h3>
          <p>
            {searchQuery || selectedType !== 'all' || selectedPass !== 'all'
              ? 'No registered vehicles matched your filter criteria. Try adjusting your search term.'
              : 'No vehicles registered in the database yet. Click below to add your first car and owner.'}
          </p>
          <button
            className="btn-register-vehicle-hero"
            onClick={() => { playSound('click'); onOpenRegisterModal(); }}
          >
            + Register First Vehicle Owner
          </button>
        </div>
      ) : (
        <div className="vehicle-cards-grid">
          {filteredOwners.map((owner) => {
            const isEv = (owner.vehicle_type || '').toLowerCase() === 'ev' || (owner.fuel_type || '').toLowerCase() === 'electric';
            const initials = (owner.owner_name || 'Driver')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={owner.id} className="vehicle-card">
                {/* Embossed License Plate Header */}
                <div className="vehicle-card-plate-strip">
                  <div className="plate-badge-embossed">
                    <span className="plate-flag-mini">IND</span>
                    <span className="plate-digits-bold">{owner.car_number}</span>
                  </div>

                  <div className="plate-right-tags">
                    <span className={`vehicle-type-tag ${isEv ? 'ev-tag' : ''}`}>
                      {isEv ? '⚡ EV' : (owner.vehicle_type || 'Car').toUpperCase()}
                    </span>
                    <span className="fuel-pill">{owner.fuel_type || 'Petrol'}</span>
                  </div>
                </div>

                {/* Vehicle Model & Color Bar */}
                <div className="vehicle-meta-bar">
                  <div className="make-model-wrap">
                    <span className="make-brand">{owner.vehicle_make || 'Vehicle'}</span>
                    <h3 className="model-name">{owner.vehicle_model || 'Standard'}</h3>
                  </div>

                  {owner.color && (
                    <div className="color-swatch-chip" title={`Color: ${owner.color}`}>
                      <span className="color-circle"></span>
                      <span className="color-name">{owner.color}</span>
                    </div>
                  )}
                </div>

                {/* Owner Information Section */}
                <div className="owner-profile-section">
                  <div className="owner-avatar">{initials}</div>
                  <div className="owner-meta">
                    <h4 className="owner-name-display">{owner.owner_name}</h4>
                    <div className="owner-contact-row">
                      <a href={`tel:${owner.phone}`} className="owner-phone-link" title="Click to call driver">
                        📞 +91 {owner.phone}
                      </a>
                      {owner.city_area && (
                        <span className="owner-area-pill">📍 {owner.city_area}</span>
                      )}
                    </div>
                    {owner.email && (
                      <span className="owner-email-line">✉️ {owner.email}</span>
                    )}
                  </div>
                </div>

                {/* Badges / Pass & FASTag */}
                <div className="pass-fastag-row">
                  <div className="pass-pill-badge" title="Parking Permit Category">
                    <span className="pass-icon">🎫</span>
                    <span>{owner.pass_type || 'Daily Pass'}</span>
                  </div>

                  {owner.fastag_id && (
                    <div className="fastag-chip" title="RFID FASTag Automated Gate Access">
                      <span className="fastag-icon">📡</span>
                      <span>{owner.fastag_id}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="vehicle-card-actions">
                  <button
                    className="btn-card-reserve"
                    onClick={() => { playSound('click'); onQuickReserve(owner); }}
                    title="Reserve parking bay with this vehicle"
                  >
                    ⚡ 1-Click Park
                  </button>

                  <button
                    className="btn-card-icon"
                    onClick={() => { playSound('click'); onEditOwner(owner); }}
                    title="Edit vehicle & owner details"
                  >
                    ✏️
                  </button>

                  <button
                    className="btn-card-icon sql-btn"
                    onClick={() => { playSound('click'); setSelectedSqlRow(owner); }}
                    title="Inspect PostgreSQL row in SQL format"
                  >
                    🐘
                  </button>

                  <button
                    className="btn-card-icon delete-btn"
                    onClick={() => handleDelete(owner)}
                    title="Delete record from PostgreSQL"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SQL Row Inspector Dialog */}
      {selectedSqlRow && (
        <div className="modal-backdrop" onClick={() => setSelectedSqlRow(null)}>
          <div className="modal-box sql-inspector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge db-badge">🐘</div>
                <div>
                  <h3 className="modal-title">PostgreSQL Tuple Inspector (public.vehicle_owners)</h3>
                  <p className="modal-subtitle">Exact relational column mapping in pgAdmin 4</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedSqlRow(null)}>✕</button>
            </div>

            <div className="sql-code-container">
              <pre>
{`-- PostgreSQL 16 Table: public.vehicle_owners
-- Primary Key: id = '${selectedSqlRow.id}'
-- Unique Key: car_number = '${selectedSqlRow.car_number}'

INSERT INTO vehicle_owners (
  id, owner_name, phone, email, car_number, vehicle_make,
  vehicle_model, vehicle_type, color, fuel_type, fastag_id,
  pass_type, city_area, emergency_phone, created_at, updated_at
) VALUES (
  '${selectedSqlRow.id}',
  '${selectedSqlRow.owner_name}',
  '${selectedSqlRow.phone}',
  ${selectedSqlRow.email ? `'${selectedSqlRow.email}'` : 'NULL'},
  '${selectedSqlRow.car_number}',
  ${selectedSqlRow.vehicle_make ? `'${selectedSqlRow.vehicle_make}'` : 'NULL'},
  ${selectedSqlRow.vehicle_model ? `'${selectedSqlRow.vehicle_model}'` : 'NULL'},
  '${selectedSqlRow.vehicle_type || 'sedan'}',
  ${selectedSqlRow.color ? `'${selectedSqlRow.color}'` : 'NULL'},
  '${selectedSqlRow.fuel_type || 'Petrol'}',
  ${selectedSqlRow.fastag_id ? `'${selectedSqlRow.fastag_id}'` : 'NULL'},
  '${selectedSqlRow.pass_type || 'Daily Pass'}',
  '${selectedSqlRow.city_area || 'Ahmedabad'}',
  ${selectedSqlRow.emergency_phone ? `'${selectedSqlRow.emergency_phone}'` : 'NULL'},
  '${selectedSqlRow.created_at}',
  '${selectedSqlRow.updated_at}'
);`}
              </pre>
            </div>

            <div className="pgadmin-instruction-box">
              <strong>💡 How to verify this in pgAdmin:</strong>
              <ol>
                <li>Open pgAdmin 4 and connect to your PostgreSQL 16 server.</li>
                <li>Navigate to: <code>Servers &gt; PostgreSQL 16 &gt; Databases &gt; wad_parking &gt; Schemas &gt; public &gt; Tables &gt; vehicle_owners</code></li>
                <li>Right-click <code>vehicle_owners</code> &gt; <strong>View/Edit Data &gt; All Rows</strong>.</li>
                <li>You will see this record with plate <code>{selectedSqlRow.car_number}</code> and owner <code>{selectedSqlRow.owner_name}</code>!</li>
              </ol>
            </div>

            <div className="modal-actions-bar single-right">
              <button className="btn-modal-primary" onClick={() => setSelectedSqlRow(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
