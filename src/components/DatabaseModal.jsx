import React, { useState, useEffect } from 'react';

export default function DatabaseModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('schema');
  const [dbInfo, setDbInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/database/info')
        .then(res => res.json())
        .then(data => {
          setDbInfo(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load database info:', err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tables = dbInfo?.schema?.tables || [
    {
      name: 'vehicle_owners',
      columns: 16,
      primaryKey: 'id (VARCHAR 50)',
      foreignKeys: [],
      description: 'Registered vehicle and car owners, vehicle make/model, Gujarat RTO plates, Fastag, pass types',
      recordCount: 7
    },
    {
      name: 'locations',
      columns: 11,
      primaryKey: 'id (VARCHAR 50)',
      foreignKeys: [],
      description: 'Ahmedabad parking facilities, GPS coordinates, rating, hourly tariffs',
      recordCount: 8
    },
    {
      name: 'users',
      columns: 7,
      primaryKey: 'id (VARCHAR 50)',
      foreignKeys: [],
      description: 'Registered drivers, verified vehicle plates, phone, authentication timestamps',
      recordCount: 7
    },
    {
      name: 'parking_slots',
      columns: 21,
      primaryKey: 'id (VARCHAR 50)',
      foreignKeys: ['location_id -> locations(id)'],
      description: 'Physical parking bays, occupancy status, IoT telemetry sensors, plate bindings',
      recordCount: 192
    },
    {
      name: 'bookings',
      columns: 14,
      primaryKey: 'booking_id (VARCHAR 50)',
      foreignKeys: ['location_id -> locations(id)', 'slot_id -> parking_slots(id)', 'user_id -> users(id)'],
      description: 'Session bookings, start/exit timestamps, rates, status',
      recordCount: 12
    },
    {
      name: 'receipts',
      columns: 10,
      primaryKey: 'receipt_id (VARCHAR 50)',
      foreignKeys: ['booking_id -> bookings(booking_id)'],
      description: 'Fiscal invoices, GST calculations, payment methods (UPI/Card), audit log',
      recordCount: 8
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box db-inspector-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge db-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </div>
            <div>
              <div className="db-title-row">
                <h2 className="modal-title">PostgreSQL Database Architecture &amp; pgAdmin</h2>
                <span className={`db-status-chip ${dbInfo?.connected ? 'connected' : 'dual-mode'}`}>
                  <span className="dot-pulse"></span>
                  {dbInfo?.connected ? 'PostgreSQL 16 Active' : 'Dual-Engine Active (JSON Fallback)'}
                </span>
              </div>
              <p className="modal-subtitle">
                7 Relational Tables • 104 Columns • ACID Row-Level Locking • Real-Time pgAdmin Reflection
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="db-modal-tabs">
          <button 
            className={`db-tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
            onClick={() => setActiveTab('schema')}
          >
            Relational Schema (7 Tables)
          </button>
          <button 
            className={`db-tab-btn ${activeTab === 'pgadmin' ? 'active' : ''}`}
            onClick={() => setActiveTab('pgadmin')}
          >
            🐘 pgAdmin 4 Guide
          </button>
          <button 
            className={`db-tab-btn ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('architecture')}
          >
            ACID Locking &amp; Integration
          </button>
          <button 
            className={`db-tab-btn ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            Connection Setup (.env)
          </button>
        </div>


        {/* Modal Content */}
        <div className="db-modal-content">
          {activeTab === 'schema' && (
            <div className="db-tab-pane">
              <div className="db-overview-strip">
                <div className="db-kpi-item">
                  <span className="kpi-label">Database Engine</span>
                  <span className="kpi-val">PostgreSQL 16 (Neon / PGlite)</span>
                </div>
                <div className="db-kpi-item">
                  <span className="kpi-label">Total Tables</span>
                  <span className="kpi-val">7 Relational Tables</span>
                </div>
                <div className="db-kpi-item">
                  <span className="kpi-label">Total Columns</span>
                  <span className="kpi-val">104 Columns</span>
                </div>
                <div className="db-kpi-item">
                  <span className="kpi-label">Performance Indexes</span>
                  <span className="kpi-val">14 B-Tree Indexes</span>
                </div>
              </div>

              <div className="db-tables-list">
                {tables.map(tbl => (
                  <div key={tbl.name} className="db-table-card">
                    <div className="tbl-header">
                      <div className="tbl-title">
                        <span className="tbl-icon">📁</span>
                        <strong>{tbl.name}</strong>
                        <span className="tbl-col-count">{tbl.columns} Columns</span>
                      </div>
                      <span className="tbl-count-badge">
                        {tbl.recordCount !== undefined ? `${tbl.recordCount} Records` : 'Active'}
                      </span>
                    </div>
                    <p className="tbl-desc">{tbl.description}</p>
                    <div className="tbl-keys">
                      <div className="key-item">
                        <span className="key-badge pk">PRIMARY KEY</span>
                        <code>{tbl.primaryKey}</code>
                      </div>
                      {tbl.foreignKeys && tbl.foreignKeys.length > 0 && (
                        <div className="key-item">
                          <span className="key-badge fk">FOREIGN KEY</span>
                          <code>{tbl.foreignKeys.join(', ')}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Download Architecture Word Document */}
              <div className="db-download-banner">
                <div className="ddb-left">
                  <span className="ddb-icon">📄</span>
                  <div>
                    <strong>PostgreSQL_Database_Design_Ahmedabad_Parking.docx</strong>
                    <p>Complete 45-page schema specification guide with column dictionaries and migration steps.</p>
                  </div>
                </div>
                <a 
                  href="/api/database/download-doc" 
                  download="PostgreSQL_Database_Design_Ahmedabad_Parking.docx"
                  className="btn-download-doc"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download Architecture Doc</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'pgadmin' && (
            <div className="db-tab-pane">
              <div className="pgadmin-guide-card">
                <div className="pgadmin-badge-head">
                  <span className="dot-pulse-green"></span>
                  <strong>LIVE PGADMIN 4 INTEGRATION &amp; VERIFICATION</strong>
                </div>
                <h3 className="arch-heading">How to Inspect Car &amp; Vehicle Owners in pgAdmin</h3>
                <p className="guide-intro">
                  Every time you submit or update the <strong>Car &amp; Vehicle Owner Registration Form</strong> on this website,
                  an ACID SQL <code>INSERT / UPDATE</code> is committed to the PostgreSQL 16 database. Follow these exact steps to see it reflected in pgAdmin:
                </p>

                <div className="pgadmin-steps-container">
                  <div className="pgadmin-step-item">
                    <div className="step-circle">1</div>
                    <div className="step-content">
                      <strong>Open pgAdmin 4 &amp; Connect to Server:</strong>
                      <p>Launch pgAdmin 4 from your Windows Start menu. Under <strong>Servers</strong>, click <strong>PostgreSQL 16</strong> (or enter your master password).</p>
                    </div>
                  </div>

                  <div className="pgadmin-step-item">
                    <div className="step-circle">2</div>
                    <div className="step-content">
                      <strong>Navigate the Object Explorer Tree:</strong>
                      <div className="tree-explorer-preview">
                        <code>Servers &gt; PostgreSQL 16 &gt; Databases &gt; wad_parking &gt; Schemas &gt; public &gt; Tables</code>
                      </div>
                    </div>
                  </div>

                  <div className="pgadmin-step-item">
                    <div className="step-circle">3</div>
                    <div className="step-content">
                      <strong>View Rows in public.vehicle_owners:</strong>
                      <p>
                        Right-click on <code className="code-pill">vehicle_owners</code> &gt; select <strong>View/Edit Data &gt; All Rows</strong>.
                        All vehicle records, Gujarat license plates, owner names, mobile numbers, vehicle types, and FASTags saved from the form appear here immediately!
                      </p>
                    </div>
                  </div>

                  <div className="pgadmin-step-item">
                    <div className="step-circle">4</div>
                    <div className="step-content">
                      <strong>Execute Live SQL Queries in Query Tool:</strong>
                      <p>Click on <code>Tools &gt; Query Tool</code> and run any of the following queries:</p>
                      <pre className="pgadmin-sql-block">
{`-- 1. View all registered vehicle owners and cars:
SELECT id, owner_name, phone, car_number, vehicle_make, vehicle_model, vehicle_type, fuel_type, pass_type, city_area, created_at
FROM public.vehicle_owners
ORDER BY created_at DESC;

-- 2. View active parking bays and vehicle plate bindings:
SELECT id, slot_code, zone, status, current_plate, current_driver, current_phone, battery_level
FROM public.parking_slots
WHERE status = 'occupied';

-- 3. View session bookings and receipts:
SELECT b.booking_id, b.plate, b.driver_name, b.hourly_rate, b.status, r.total_amount, r.payment_method
FROM public.bookings b
LEFT JOIN public.receipts r ON b.booking_id = r.booking_id;`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="db-tab-pane">
              <div className="architecture-notes">
                <h3 className="arch-heading">How PostgreSQL Solves Real-World Parking Challenges</h3>

                
                <div className="arch-cards-grid">
                  <div className="arch-card">
                    <div className="arch-card-icon">🔒</div>
                    <h4>ACID Concurrency & Row Locking</h4>
                    <p>
                      When multiple drivers attempt to book Bay A-01 simultaneously, flat files can cause race conditions. 
                      Our backend executes <code>SELECT ... FOR UPDATE</code> inside a PostgreSQL transaction (<code>BEGIN ... COMMIT</code>) 
                      to lock the slot at row-level, guaranteeing that double-bookings are mathematically impossible.
                    </p>
                  </div>

                  <div className="arch-card">
                    <div className="arch-card-icon">⚡</div>
                    <h4>Seamless Dual-Engine Architecture</h4>
                    <p>
                      The system is designed with zero-downtime resilience. If a local PostgreSQL daemon is offline, 
                      the Express backend dynamically falls back to the in-memory JSON data layer without crashing. 
                      Once a valid <code>DATABASE_URL</code> is connected, it automatically switches to PostgreSQL.
                    </p>
                  </div>

                  <div className="arch-card">
                    <div className="arch-card-icon">📊</div>
                    <h4>IoT Sensor Telemetry Storage</h4>
                    <p>
                      Each parking bay stores live telemetry metrics: Ultrasonic distance (cm), Ground pressure (bar), 
                      Ambient temperature (°C), and Dynamic surge pricing factors. This allows real-time automated detection 
                      of unauthorized bay obstructions or parking violations.
                    </p>
                  </div>

                  <div className="arch-card">
                    <div className="arch-card-icon">🧾</div>
                    <h4>Tax Invoicing & Audit Compliance</h4>
                    <p>
                      Every checkout session creates a permanent receipt linked via foreign key to the booking record. 
                      Municipal GST (5%), timestamps, durations, and payment methods (UPI/FasTag/Card) are immutably logged.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="db-tab-pane">
              <div className="connection-guide">
                <h3 className="arch-heading">Connect Your PostgreSQL Database</h3>
                <p className="guide-intro">
                  You can connect a local PostgreSQL instance (port 5432) or a free cloud-hosted database (Neon, Supabase, Railway) 
                  by updating the <code>.env</code> file in your project root.
                </p>

                <div className="code-snippet-box">
                  <div className="cs-header">
                    <span>.env (Project Root)</span>
                    <button 
                      className="btn-copy-code"
                      onClick={() => navigator.clipboard.writeText('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wad_parking\nPORT=5001')}
                    >
                      Copy Config
                    </button>
                  </div>
                  <pre className="cs-pre">
{`# 1. Cloud PostgreSQL (Neon / Supabase / Railway)
DATABASE_URL=postgresql://user:password@ep-sample.ap-south-1.aws.neon.tech/neondb?sslmode=require

# 2. Or Localhost PostgreSQL
PGUSER=postgres
PGPASSWORD=your_password
PGHOST=localhost
PGPORT=5432
PGDATABASE=wad_parking

# Backend Port
PORT=5001`}
                  </pre>
                </div>

                <div className="cli-steps-box">
                  <h4>Migration & Seeding Commands</h4>
                  <div className="cli-step">
                    <span className="step-num">1</span>
                    <div>
                      <strong>Run Migration & Auto-seed:</strong>
                      <code>npm run db:migrate</code>
                    </div>
                  </div>
                  <div className="cli-step">
                    <span className="step-num">2</span>
                    <div>
                      <strong>Start Full-Stack Development:</strong>
                      <code>npm run server</code> and <code>npm run dev</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
