import React, { useState, useEffect } from 'react';

const TABLES = [
  { id: 'vehicle_owners', label: 'Vehicle Owners', icon: '🚗', desc: 'Car Owners & Gujarat Plates' },
  { id: 'wallet_transactions', label: 'Wallet Ledger', icon: '💳', desc: 'Pre-pay Debits & Recharges' },
  { id: 'bookings', label: 'Bookings', icon: '📋', desc: 'Gate Check-ins & Parking Passes' },
  { id: 'parking_slots', label: 'Parking Slots', icon: '🅿️', desc: 'Physical Bays & Telemetry' },
  { id: 'users', label: 'Users', icon: '👥', desc: 'Registered Citizens & Wallets' },
  { id: 'locations', label: 'Locations', icon: '📍', desc: 'Ahmedabad Parking Hubs' },
  { id: 'receipts', label: 'Receipts', icon: '🧾', desc: 'Fiscal GST Invoices' },
];

export default function DatabaseTableViewer({ onOpenDbModal }) {
  const [selectedTable, setSelectedTable] = useState('vehicle_owners');
  const [data, setData] = useState({ rows: [], rowCount: 0, source: 'PostgreSQL 16 (Live)' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchTableData = async (table) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/database/table/${table}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load table:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(selectedTable);
    setSelectedRow(null);
  }, [selectedTable]);

  // Filter rows based on search
  const filteredRows = (data.rows || []).filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  // Extract columns from first row if available
  const columns = data.rows && data.rows.length > 0 ? Object.keys(data.rows[0]) : [];

  const renderCellValue = (col, val) => {
    if (val === null || val === undefined) return <span className="cell-null">—</span>;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';

    const colLower = col.toLowerCase();
    const strVal = String(val);

    // Format status tags
    if (colLower.includes('status')) {
      const statusClass =
        strVal.toLowerCase() === 'available' || strVal.toLowerCase() === 'paid'
          ? 'badge-success'
          : strVal.toLowerCase() === 'occupied' || strVal.toLowerCase() === 'active'
          ? 'badge-warning'
          : 'badge-neutral';
      return <span className={`table-badge ${statusClass}`}>{strVal.toUpperCase()}</span>;
    }

    // Format currency / rate
    if (colLower.includes('rate') || colLower.includes('amount') || colLower.includes('subtotal') || colLower.includes('tax')) {
      return <span className="cell-currency">₹{parseFloat(val).toFixed(2)}</span>;
    }

    // Format timestamps
    if (colLower.includes('_at') || colLower.includes('time') || colLower.includes('login')) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return <span className="cell-date">{d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>;
      }
    }

    // License plates
    if (colLower.includes('plate') || colLower.includes('carnumber') || colLower.includes('car_number')) {
      return (
        <span className="mini-license-plate">
          <span className="plate-flag">IND</span>
          {strVal}
        </span>
      );
    }

    return strVal.length > 40 ? `${strVal.substring(0, 40)}...` : strVal;
  };

  return (
    <div className="db-viewer-container">
      {/* Header ribbon */}
      <div className="db-viewer-header">
        <div className="db-viewer-title-group">
          <div className="db-badge-icon">🐘</div>
          <div>
            <div className="db-header-top-row">
              <h2 className="db-viewer-title">PostgreSQL Live Data Explorer</h2>
              <span className="live-db-pill">
                <span className="dot-pulse"></span>
                {data.source || 'PostgreSQL 16 Active'}
              </span>
            </div>
            <p className="db-viewer-subtitle">
              Live ACID transactions, 5 synchronized tables, and real-time Ahmedabad sensor data
            </p>
          </div>
        </div>

        <div className="db-viewer-actions">
          <button className="db-btn secondary" onClick={() => fetchTableData(selectedTable)} title="Refresh data">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spin' : ''}>
              <path d="M23 4v6h-6"></path>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Refresh</span>
          </button>
          <button className="db-btn primary" onClick={onOpenDbModal}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span>Schema & pgAdmin Guide</span>
          </button>
        </div>
      </div>

      {/* Segmented Table Selector */}
      <div className="db-table-tabs">
        {TABLES.map((t) => (
          <button
            key={t.id}
            className={`db-table-tab-btn ${selectedTable === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTable(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <div className="tab-meta">
              <span className="tab-name">{t.label}</span>
              <span className="tab-desc">{t.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Search and Table Metrics Bar */}
      <div className="db-table-toolbar">
        <div className="db-search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder={`Filter ${selectedTable} rows (e.g. plate, name, status)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="db-search-input"
          />
          {searchTerm && (
            <button className="db-search-clear" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="db-table-metrics">
          <span className="metric-tag">
            Total Rows: <strong>{data.rowCount || (data.rows ? data.rows.length : 0)}</strong>
          </span>
          {searchTerm && (
            <span className="metric-tag matched">
              Matching: <strong>{filteredRows.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Live Table Area */}
      <div className="db-table-scroll-container">
        {loading ? (
          <div className="db-loading-state">
            <div className="loading-spinner"></div>
            <span>Fetching live records from PostgreSQL...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="db-empty-state">
            <span>No records found matching "{searchTerm}"</span>
          </div>
        ) : (
          <table className="db-records-table">
            <thead>
              <tr>
                <th className="col-idx">#</th>
                {columns.map((col) => (
                  <th key={col} className="col-header">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`db-table-row ${selectedRow === row ? 'selected-row' : ''}`}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="col-idx">{idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col} className="col-data">
                      {renderCellValue(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Row Detail Drawer (Apple Style) */}
      {selectedRow && (
        <div className="db-row-inspector">
          <div className="row-inspector-header">
            <h4>Row Detail Inspector</h4>
            <button className="close-inspector-btn" onClick={() => setSelectedRow(null)}>✕</button>
          </div>
          <div className="row-inspector-grid">
            {Object.entries(selectedRow).map(([k, v]) => (
              <div key={k} className="inspector-field">
                <span className="field-name">{k}</span>
                <span className="field-value">{v !== null && v !== undefined ? String(v) : 'NULL'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
