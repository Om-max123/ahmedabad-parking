import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateSlotsFromDataset, parseCSVDataset } from './datasetLoader.js';
import { initPostgres, isDbConnected, query, getClient, getDbEngine, isCloudDatabaseConfigured, getDbInitError, getDbHost } from './db.js';
import { signToken, requireAuth, optionalAuth, requireAdmin, verifyGoogleIdToken } from './auth.js';
import { applySafeDatabaseEnhancements } from './safe-migrate.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const SEED_FILE = path.join(DATA_DIR, 'ahmedabad_parking.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const VEHICLE_OWNERS_FILE = path.join(DATA_DIR, 'vehicle_owners.json');
const WALLET_TX_FILE = path.join(DATA_DIR, 'wallet_transactions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let locations = [];
let bookings = [];
let users = [];
let vehicleOwners = [];
let walletTransactions = [];

function initLocationsFromDataset() {
  const baseLocations = [
    {
      id: "loc-cg-road",
      name: "CG Road Multi-Level Smart Parking",
      area: "Navrangpura",
      address: "Opp. Municipal Market, C.G. Road, Navrangpura, Ahmedabad - 380009",
      lat: 23.0315,
      lng: 72.5574,
      rating: 4.8,
      hourlyRate: 30,
      currency: "₹",
    },
    {
      id: "loc-vastrapur",
      name: "Vastrapur Lake Commercial Hub Parking",
      area: "Vastrapur",
      address: "Near AlphaOne Mall & Vastrapur Lake, Vastrapur, Ahmedabad - 380015",
      lat: 23.0350,
      lng: 72.5293,
      rating: 4.7,
      hourlyRate: 40,
      currency: "₹",
    },
    {
      id: "loc-riverfront",
      name: "Sabarmati Riverfront Multi-Bay Facility",
      area: "Riverfront West",
      address: "West Riverfront Promenade, Near Event Ground, Ahmedabad - 380006",
      lat: 23.0304,
      lng: 72.5707,
      rating: 4.9,
      hourlyRate: 25,
      currency: "₹",
    },
    {
      id: "loc-prahlad-nagar",
      name: "Prahlad Nagar Corporate Parking Zone",
      area: "SG Highway / Prahlad Nagar",
      address: "Corporate Road, Opposite Prahlad Nagar Garden, Ahmedabad - 380015",
      lat: 23.0125,
      lng: 72.5075,
      rating: 4.8,
      hourlyRate: 50,
      currency: "₹",
    },
    {
      id: "loc-sbr",
      name: "Sindhu Bhavan Smart Hub Parking",
      area: "Bodakdev",
      address: "Sindhu Bhavan Marg, Next to Taj Skyline, Bodakdev, Ahmedabad - 380054",
      lat: 23.0456,
      lng: 72.5078,
      rating: 4.9,
      hourlyRate: 60,
      currency: "₹",
    },
    {
      id: "loc-manek-chowk",
      name: "Manek Chowk Heritage Parking Plaza",
      area: "Old City",
      address: "Near Teen Darwaza & Manek Chowk, Khadia, Ahmedabad - 380001",
      lat: 23.0238,
      lng: 72.5902,
      rating: 4.5,
      hourlyRate: 30,
      currency: "₹",
    },
    {
      id: "loc-law-garden",
      name: "Law Garden Urban Parking Deck",
      area: "Ellisbridge",
      address: "Netaji Road, Opposite Law Garden Khau Gali, Ahmedabad - 380006",
      lat: 23.0242,
      lng: 72.5598,
      rating: 4.6,
      hourlyRate: 30,
      currency: "₹",
    },
    {
      id: "loc-kankaria",
      name: "Kankaria Lake Multi-Bay Parking",
      area: "Maninagar",
      address: "Gate No. 1, Kankaria Lake Front, Maninagar, Ahmedabad - 380028",
      lat: 22.9978,
      lng: 72.6026,
      rating: 4.7,
      hourlyRate: 25,
      currency: "₹",
    },
    {
      id: "loc-thaltej",
      name: "Thaltej Metro & Commercial Hub Parking",
      area: "Thaltej",
      address: "Near Thaltej Cross Roads & Thaltej Metro Station, SG Highway, Thaltej, Ahmedabad - 380059",
      lat: 23.0514,
      lng: 72.5126,
      rating: 4.8,
      hourlyRate: 35,
      currency: "₹",
    }
  ];

  return baseLocations.map((loc) => {
    const slots = generateSlotsFromDataset(loc.id, loc.name, loc.hourlyRate);
    return {
      ...loc,
      slots,
    };
  });
}

function loadData() {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
      if (parsed && parsed.length > 0 && parsed[0].slots && parsed[0].slots.length > 0 && parsed[0].slots[0].sensor) {
        locations = parsed;
      } else {
        locations = initLocationsFromDataset();
        saveLocations();
      }
    } else {
      locations = initLocationsFromDataset();
      saveLocations();
    }
  } catch (err) {
    console.error('Error loading locations, regenerating from dataset:', err);
    locations = initLocationsFromDataset();
    saveLocations();
  }

  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      bookings = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    } else {
      bookings = [];
    }
  } catch {
    bookings = [];
  }

  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    } else {
      users = [];
    }
  } catch {
    users = [];
  }

  try {
    if (fs.existsSync(VEHICLE_OWNERS_FILE)) {
      vehicleOwners = JSON.parse(fs.readFileSync(VEHICLE_OWNERS_FILE, 'utf-8'));
    } else {
      vehicleOwners = [];
    }
  } catch {
    vehicleOwners = [];
  }

  try {
    if (fs.existsSync(WALLET_TX_FILE)) {
      walletTransactions = JSON.parse(fs.readFileSync(WALLET_TX_FILE, 'utf-8'));
    } else {
      walletTransactions = [];
    }
  } catch {
    walletTransactions = [];
  }
}

function saveLocations() {
  try {
    fs.writeFileSync(SEED_FILE, JSON.stringify(locations, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save locations:', err);
  }
}

function saveBookings() {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save bookings:', err);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save users:', err);
  }
}

function saveVehicleOwners() {
  try {
    fs.writeFileSync(VEHICLE_OWNERS_FILE, JSON.stringify(vehicleOwners, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save vehicle owners:', err);
  }
}

function saveWalletTransactions() {
  try {
    fs.writeFileSync(WALLET_TX_FILE, JSON.stringify(walletTransactions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save wallet transactions:', err);
  }
}

// Seed PostgreSQL from memory if PostgreSQL is connected but has empty tables
async function autoSeedPostgresIfEmpty() {
  if (!isDbConnected()) return;
  try {
    const countRes = await query('SELECT COUNT(*) FROM locations');
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      console.log('[PostgreSQL] Database tables are empty. Auto-seeding initial locations & slots...');
      for (const loc of locations) {
        await query(`
          INSERT INTO locations (id, name, area, address, lat, lng, rating, hourly_rate, currency)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [loc.id, loc.name, loc.area, loc.address, loc.lat, loc.lng, loc.rating, loc.hourlyRate, loc.currency || '₹']);

        for (const s of (loc.slots || [])) {
          const slotDbId = `${loc.id}_${s.id}`;
          const isOccupied = s.status === 'occupied';
          const v = s.vehicle || {};
          const sn = s.sensor || {};
          await query(`
            INSERT INTO parking_slots (
              id, location_id, slot_code, spot_number, zone, slot_type, status,
              current_plate, current_driver, current_phone, parked_at, battery_level,
              sensor_ultrasonic, sensor_proximity, sensor_pressure, sensor_noise,
              sensor_temperature, nearby_traffic, dynamic_pricing_factor, spot_size
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (id) DO NOTHING
          `, [
            slotDbId, loc.id, s.id, s.spotNumber || 1, s.zone || 'A', s.type || 'compact', s.status || 'available',
            isOccupied ? v.plate : null, isOccupied ? v.driver : null, isOccupied ? v.phone : null,
            isOccupied && v.parkedAt ? new Date(v.parkedAt) : null, isOccupied ? v.batteryLevel : null,
            sn.ultrasonic || 100, sn.proximity || 2.5, sn.pressure || 3.0, sn.noise || 50,
            sn.temperature || 28, sn.traffic || 'Low', sn.dynamicPricing || 1.0, sn.spotSize || 'Standard'
          ]);
        }
      }
      console.log('[PostgreSQL] Auto-seeding completed.');
    }

    const ownersCnt = await query('SELECT COUNT(*) FROM vehicle_owners');
    if (parseInt(ownersCnt.rows[0].count, 10) === 0 && vehicleOwners.length > 0) {
      console.log('[PostgreSQL] Auto-seeding vehicle owners...');
      for (const o of vehicleOwners) {
        await query(`
          INSERT INTO vehicle_owners (
            id, owner_name, phone, email, car_number, vehicle_make, vehicle_model,
            vehicle_type, color, fuel_type, fastag_id, pass_type, city_area,
            emergency_phone, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (car_number) DO NOTHING;
        `, [
          o.id, o.owner_name, o.phone, o.email || null, o.car_number, o.vehicle_make || null,
          o.vehicle_model || null, o.vehicle_type || 'sedan', o.color || null, o.fuel_type || 'Petrol',
          o.fastag_id || null, o.pass_type || 'Daily Pass', o.city_area || 'Ahmedabad', o.emergency_phone || null,
          o.created_at ? new Date(o.created_at) : new Date(), o.updated_at ? new Date(o.updated_at) : new Date()
        ]);
      }
      console.log('[PostgreSQL] Auto-seeded vehicle owners.');
    }
  } catch (err) {
    console.error('[PostgreSQL] Auto-seed check error:', err.message);
  }
}

// Initial local data load
loadData();

// Dataset-simulated parked cars carry old timestamps; keep them looking like live sessions
// (arrived within the last 3 hours). Bays with a real customer booking are never touched.
async function refreshSimulatedOccupancy() {
  await query(`
    UPDATE parking_slots s
    SET parked_at = NOW() - (INTERVAL '10 minutes' + random() * INTERVAL '170 minutes')
    WHERE s.status = 'occupied'
      AND (s.parked_at IS NULL OR s.parked_at < NOW() - INTERVAL '12 hours')
      AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status = 'active');
  `);
}

// One-time database bootstrap (shared by local server and Vercel serverless function)
let dbReadyPromise = null;
function ensureDatabaseReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      const connected = await initPostgres();
      if (connected) {
        try {
          await applySafeDatabaseEnhancements();
          await autoSeedPostgresIfEmpty();
          await refreshSimulatedOccupancy();
        } catch (err) {
          console.warn('[PostgreSQL] Initialization enhancements notice:', err.message);
        }
      } else {
        // Let the next request try again instead of caching the failure for this instance
        dbReadyPromise = null;
      }
      return connected;
    })();
  }
  return dbReadyPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseReady();
  } catch (err) {
    console.error('[PostgreSQL] Bootstrap error:', err.message);
  }
  // With a cloud database configured, never serve from the local JSON fallback
  if (isCloudDatabaseConfigured() && !isDbConnected() && req.path !== '/api/health') {
    return res.status(503).json({ error: 'Database is temporarily unavailable. Please try again in a moment.' });
  }
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbHost = getDbHost();
  const dbStatus = !isDbConnected()
    ? (isCloudDatabaseConfigured() ? `Cloud PostgreSQL unreachable (${getDbInitError() || 'unknown error'})` : 'JSON Local Storage (Fallback Mode)')
    : getDbEngine() === 'pglite'
      ? 'PostgreSQL (Embedded PGlite Engine)'
      : dbHost.includes('supabase')
        ? 'PostgreSQL (Supabase)'
        : 'PostgreSQL (Active & Connected)';
  res.json({
    status: 'ok',
    system: 'Ahmedabad Smart Parking Management System',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    totalLocations: locations.length,
    datasetConnected: true,
  });
});

// Database Schema & Status Inspector Endpoint
app.get('/api/database/info', async (req, res) => {
  const isConnected = isDbConnected();
  let tableCounts = {
    locations: locations.length,
    users: users.length,
    vehicle_owners: vehicleOwners.length,
    parking_slots: locations.reduce((sum, l) => sum + (l.slots?.length || 0), 0),
    bookings: bookings.length,
    receipts: bookings.filter(b => b.receipt).length,
    wallet_transactions: walletTransactions.length,
  };

  if (isConnected) {
    try {
      const [locCnt, userCnt, ownerCnt, slotCnt, bkCnt, rcpCnt, wtxCnt] = await Promise.all([
        query('SELECT COUNT(*) FROM locations'),
        query('SELECT COUNT(*) FROM users'),
        query('SELECT COUNT(*) FROM vehicle_owners'),
        query('SELECT COUNT(*) FROM parking_slots'),
        query('SELECT COUNT(*) FROM bookings'),
        query('SELECT COUNT(*) FROM receipts'),
        query('SELECT COUNT(*) FROM wallet_transactions'),
      ]);
      tableCounts = {
        locations: parseInt(locCnt.rows[0].count, 10),
        users: parseInt(userCnt.rows[0].count, 10),
        vehicle_owners: parseInt(ownerCnt.rows[0].count, 10),
        parking_slots: parseInt(slotCnt.rows[0].count, 10),
        bookings: parseInt(bkCnt.rows[0].count, 10),
        receipts: parseInt(rcpCnt.rows[0].count, 10),
        wallet_transactions: parseInt(wtxCnt.rows[0].count, 10),
      };
    } catch (e) {
      console.error('Error fetching table counts:', e.message);
    }
  }

  res.json({
    connected: isConnected,
    mode: isConnected ? 'PostgreSQL Active Connection' : 'Dual-Engine JSON Fallback',
    engine: 'PostgreSQL 16 / Ahmedabad Smart Mobility Cluster',
    dialect: 'Relational SQL with ACID Transactions (Row-level Locking)',
    schema: {
      tables: [
        {
          name: 'vehicle_owners',
          columns: 17,
          primaryKey: 'id (VARCHAR 50)',
          foreignKeys: [],
          description: 'Registered vehicle and car owners, Gujarat RTO plates, Fastag, pass types, Smart Wallet balance',
          recordCount: tableCounts.vehicle_owners
        },
        {
          name: 'locations',
          columns: 11,
          primaryKey: 'id (VARCHAR 50)',
          foreignKeys: [],
          description: 'Ahmedabad parking facilities, GPS coordinates, rating, hourly tariffs',
          recordCount: tableCounts.locations
        },
        {
          name: 'users',
          columns: 9,
          primaryKey: 'id (VARCHAR 50)',
          foreignKeys: [],
          description: 'Registered drivers, verified vehicle plates, phone, role, authentication timestamps, Smart Wallet balance',
          recordCount: tableCounts.users
        },
        {
          name: 'parking_slots',
          columns: 21,
          primaryKey: 'id (VARCHAR 50)',
          foreignKeys: ['location_id -> locations(id)'],
          description: 'Physical parking bays, occupancy status, IoT telemetry sensors, plate bindings',
          recordCount: tableCounts.parking_slots
        },
        {
          name: 'bookings',
          columns: 19,
          primaryKey: 'booking_id (VARCHAR 50)',
          foreignKeys: ['location_id -> locations(id)', 'slot_id -> parking_slots(id)', 'user_id -> users(id)'],
          description: 'Session bookings, start/exit timestamps, gate arrival verification, prepaid payment status, idempotency',
          recordCount: tableCounts.bookings
        },
        {
          name: 'receipts',
          columns: 10,
          primaryKey: 'receipt_id (VARCHAR 50)',
          foreignKeys: ['booking_id -> bookings(booking_id)'],
          description: 'Fiscal invoices, GST calculations, payment methods (Smart Wallet/UPI), audit log',
          recordCount: tableCounts.receipts
        },
        {
          name: 'wallet_transactions',
          columns: 9,
          primaryKey: 'id (VARCHAR 50)',
          foreignKeys: ['user_id -> users(id)'],
          description: 'Smart Mobility digital wallet ledger, pre-pay debits, UPI/Card top-up credits, running balance',
          recordCount: tableCounts.wallet_transactions
        }
      ],
      totalColumns: 97,
      indexes: [
        'idx_vehicle_owners_car_number',
        'idx_vehicle_owners_phone',
        'idx_slots_location',
        'idx_slots_status',
        'idx_bookings_plate',
        'idx_bookings_phone',
        'idx_bookings_status',
        'idx_bookings_user_id',
        'idx_unique_active_slot_booking',
        'idx_bookings_idempotency',
        'idx_wallet_tx_user',
        'idx_wallet_tx_car',
        'idx_wallet_tx_ref'
      ]
    },
    documentationFile: 'PostgreSQL_Database_Design_Ahmedabad_Parking.docx'
  });
});

// Fetch Live Table Rows for Database Explorer
app.get('/api/database/table/:name', async (req, res) => {
  const allowedTables = ['vehicle_owners', 'locations', 'users', 'parking_slots', 'bookings', 'receipts', 'wallet_transactions'];
  const tableName = req.params.name.toLowerCase();

  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  if (isDbConnected()) {
    try {
      const orderClause = tableName === 'receipts'
        ? 'ORDER BY paid_at DESC'
        : (tableName === 'vehicle_owners' || tableName === 'users' || tableName === 'wallet_transactions' || tableName === 'bookings')
          ? 'ORDER BY created_at DESC'
          : '';
      const result = await query(`SELECT * FROM ${tableName} ${orderClause} LIMIT 100`);
      return res.json({
        success: true,
        source: 'PostgreSQL 16 (Live)',
        table: tableName,
        rowCount: result.rowCount,
        rows: result.rows
      });
    } catch (err) {
      console.error(`Error querying table ${tableName}:`, err.message);
    }
  }

  // Fallback to memory / json dataset
  let fallbackRows = [];
  if (tableName === 'vehicle_owners') fallbackRows = vehicleOwners;
  else if (tableName === 'locations') fallbackRows = locations;
  else if (tableName === 'users') fallbackRows = users;
  else if (tableName === 'bookings') fallbackRows = bookings;
  else if (tableName === 'receipts') fallbackRows = bookings.filter(b => b.receipt).map(b => b.receipt);
  else if (tableName === 'parking_slots') fallbackRows = locations.flatMap(l => (l.slots || []).map(s => ({ location_id: l.id, ...s })));
  else if (tableName === 'wallet_transactions') fallbackRows = walletTransactions;

  res.json({
    success: true,
    source: 'Memory Cache / JSON Dataset',
    table: tableName,
    rowCount: fallbackRows.length,
    rows: fallbackRows.slice(0, 100)
  });
});

// Download PostgreSQL Word Document Architecture Guide
app.get('/api/database/download-doc', (req, res) => {
  const docPath = path.join(__dirname, '..', 'PostgreSQL_Database_Design_Ahmedabad_Parking.docx');
  if (fs.existsSync(docPath)) {
    res.download(docPath, 'PostgreSQL_Database_Design_Ahmedabad_Parking.docx');
  } else {
    res.status(404).json({ error: 'Documentation file not found' });
  }
});

// ============================================================
// LOCATIONS & PARKING SLOTS API
// ============================================================

// 1. Get all Ahmedabad parking locations with summary stats
app.get('/api/locations', async (req, res) => {
  const searchQ = (req.query.q || req.query.query || '').trim();
  const maxRate = parseFloat(req.query.maxRate) || null;

  if (isDbConnected()) {
    try {
      let sql = `
        SELECT 
          l.id,
          l.name,
          l.area,
          l.address,
          l.lat::float,
          l.lng::float,
          l.rating::float,
          l.hourly_rate::float AS "hourlyRate",
          l.currency,
          COUNT(s.id)::int AS "totalSlots",
          COUNT(s.id) FILTER (WHERE s.status = 'occupied')::int AS "occupiedSlots",
          COUNT(s.id) FILTER (WHERE s.status = 'available')::int AS "availableSlots"
        FROM locations l
        LEFT JOIN parking_slots s ON l.id = s.location_id
      `;
      const conditions = [];
      const params = [];

      if (searchQ) {
        params.push(`%${searchQ}%`);
        conditions.push(`(l.name ILIKE $${params.length} OR l.area ILIKE $${params.length} OR l.address ILIKE $${params.length})`);
      }

      if (maxRate) {
        params.push(maxRate);
        conditions.push(`l.hourly_rate <= $${params.length}`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += `
        GROUP BY l.id, l.name, l.area, l.address, l.lat, l.lng, l.rating, l.hourly_rate, l.currency
        ORDER BY l.name ASC;
      `;
      const result = await query(sql, params);
      return res.json(result.rows);
    } catch (err) {
      console.error('[PostgreSQL] /api/locations error:', err.message);
    }
  }

  // Fallback to memory
  let filtered = locations;
  if (searchQ) {
    const qLower = searchQ.toLowerCase();
    filtered = filtered.filter(l => 
      l.name.toLowerCase().includes(qLower) || 
      l.area.toLowerCase().includes(qLower) || 
      l.address.toLowerCase().includes(qLower)
    );
  }
  if (maxRate) {
    filtered = filtered.filter(l => l.hourlyRate <= maxRate);
  }

  const summary = filtered.map(loc => {
    const totalSlots = loc.slots ? loc.slots.length : 24;
    const occupiedSlots = loc.slots ? loc.slots.filter(s => s.status === 'occupied').length : 8;
    const availableSlots = loc.slots ? loc.slots.filter(s => s.status === 'available').length : 16;
    return {
      id: loc.id,
      name: loc.name,
      area: loc.area,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      rating: loc.rating,
      hourlyRate: loc.hourlyRate,
      currency: loc.currency || '₹',
      totalSlots,
      occupiedSlots,
      availableSlots,
    };
  });
  res.json(summary);
});

// 2. Get specific location details with parking slots & sensor telemetry
app.get('/api/locations/:id', async (req, res) => {
  const locId = req.params.id;

  if (isDbConnected()) {
    try {
      const locRes = await query('SELECT * FROM locations WHERE id = $1', [locId]);
      if (locRes.rows.length === 0) {
        return res.status(404).json({ error: 'Parking location not found' });
      }
      const locRow = locRes.rows[0];

      const slotsRes = await query(
        'SELECT * FROM parking_slots WHERE location_id = $1 ORDER BY spot_number ASC',
        [locId]
      );

      const slots = slotsRes.rows.map(s => {
        const isOccupied = s.status === 'occupied';
        return {
          id: s.slot_code,
          dbId: s.id,
          spotNumber: s.spot_number,
          zone: s.zone,
          type: s.slot_type,
          status: s.status,
          vehicle: isOccupied ? {
            plate: s.current_plate,
            driver: s.current_driver,
            phone: s.current_phone,
            type: s.slot_type,
            parkedAt: s.parked_at ? new Date(s.parked_at).getTime() : Date.now(),
            batteryLevel: s.battery_level,
            userType: 'Registered',
            paymentStatus: 'PAID_WALLET',
          } : null,
          sensor: {
            ultrasonic: parseFloat(s.sensor_ultrasonic) || 100,
            proximity: parseFloat(s.sensor_proximity) || 2.5,
            pressure: parseFloat(s.sensor_pressure) || 3.0,
            noise: parseFloat(s.sensor_noise) || 50,
            temperature: parseFloat(s.sensor_temperature) || 28,
            traffic: s.nearby_traffic || 'Low',
            dynamicPricing: parseFloat(s.dynamic_pricing_factor) || 1.0,
            spotSize: s.spot_size || 'Standard',
          },
        };
      });

      const totalSlots = slots.length;
      const occupiedSlots = slots.filter(s => s.status === 'occupied').length;
      const availableSlots = slots.filter(s => s.status === 'available').length;

      return res.json({
        id: locRow.id,
        name: locRow.name,
        area: locRow.area,
        address: locRow.address,
        lat: parseFloat(locRow.lat),
        lng: parseFloat(locRow.lng),
        rating: parseFloat(locRow.rating),
        hourlyRate: parseFloat(locRow.hourly_rate),
        currency: locRow.currency || '₹',
        slots,
        totalSlots,
        occupiedSlots,
        availableSlots,
      });
    } catch (err) {
      console.error('[PostgreSQL] /api/locations/:id error:', err.message);
    }
  }

  // Fallback to memory
  const loc = locations.find(l => l.id === locId);
  if (!loc) {
    return res.status(404).json({ error: 'Parking location not found' });
  }
  const totalSlots = loc.slots.length;
  const occupiedSlots = loc.slots.filter(s => s.status === 'occupied').length;
  const availableSlots = loc.slots.filter(s => s.status === 'available').length;
  res.json({
    ...loc,
    totalSlots,
    occupiedSlots,
    availableSlots,
  });
});

// ============================================================
// AUTHENTICATION & DRIVER PROFILE API
// ============================================================

// Register or Login Driver
// Mobile numbers that sign in as municipal admin operators (demo admin profile included)
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '9909988776').split(',').map(p => p.trim()).filter(Boolean);
function isAdminPhone(phone) {
  return ADMIN_PHONES.includes(phone);
}

app.post('/api/auth/login', async (req, res) => {
  const { name, phone, carNumber, vehicleType = 'compact' } = req.body;

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'Valid phone number is required.' });
  }
  if (!carNumber || typeof carNumber !== 'string' || !carNumber.trim()) {
    return res.status(400).json({ error: 'Vehicle / Car registration number is required.' });
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile phone number.' });
  }
  const cleanCar = carNumber.trim().toUpperCase().replace(/\s+/g, '-');
  const cleanName = (name && name.trim()) || 'Driver';
  const cleanType = vehicleType || 'compact';

  if (isDbConnected()) {
    try {
      // The mobile number identifies the account; a plate may belong to only one account
      const plateOwner = await query('SELECT id, phone FROM users WHERE car_number = $1 LIMIT 1', [cleanCar]);
      if (plateOwner.rows.length > 0 && plateOwner.rows[0].phone !== cleanPhone) {
        return res.status(409).json({
          error: `Vehicle ${cleanCar} is already registered to a different mobile number. Sign in with that number or use another vehicle.`
        });
      }

      const existing = await query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [cleanPhone]);
      const role = isAdminPhone(cleanPhone) ? 'admin' : null;

      let userObj;
      if (existing.rows.length > 0) {
        const u = existing.rows[0];
        const updateRes = await query(`
          UPDATE users
          SET name = $1, car_number = $2, vehicle_type = $3, role = COALESCE($5, role), last_login = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *;
        `, [cleanName, cleanCar, cleanType, u.id, role]);
        userObj = updateRes.rows[0];
      } else {
        const newId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const insertRes = await query(`
          INSERT INTO users (id, name, phone, car_number, vehicle_type, wallet_balance, role, created_at, last_login)
          VALUES ($1, $2, $3, $4, $5, 500.00, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *;
        `, [newId, cleanName, cleanPhone, cleanCar, cleanType, role || 'driver']);
        userObj = insertRes.rows[0];
      }

      // Sync vehicle_owners table so pgAdmin and vehicle registry reflect the active driver
      await query(`
        INSERT INTO vehicle_owners (
          id, owner_name, phone, car_number, vehicle_type, wallet_balance, city_area, pass_type, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Ahmedabad', 'Daily Pass', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (car_number) DO UPDATE SET
          owner_name = EXCLUDED.owner_name,
          phone = EXCLUDED.phone,
          vehicle_type = EXCLUDED.vehicle_type,
          wallet_balance = EXCLUDED.wallet_balance,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        `own_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        cleanName,
        cleanPhone,
        cleanCar,
        cleanType === 'compact' ? 'sedan' : cleanType,
        parseFloat(userObj.wallet_balance || 500.00)
      ]);

      const token = signToken({
        userId: userObj.id,
        phone: userObj.phone,
        carNumber: userObj.car_number,
        name: userObj.name,
        role: userObj.role || 'driver'
      });

      return res.json({
        success: true,
        message: 'Driver authenticated successfully (PostgreSQL Session)',
        token,
        user: {
          id: userObj.id,
          name: userObj.name,
          phone: userObj.phone,
          carNumber: userObj.car_number,
          vehicleType: userObj.vehicle_type,
          walletBalance: parseFloat(userObj.wallet_balance || 500.00),
          role: userObj.role || 'driver',
          createdAt: userObj.created_at,
          lastLogin: userObj.last_login,
        },
      });
    } catch (err) {
      console.error('[PostgreSQL] /api/auth/login error:', err.message);
      return res.status(500).json({ error: 'Authentication failed: ' + err.message });
    }
  }

  // Fallback to memory
  let user = users.find(u => u.phone === cleanPhone || u.carNumber === cleanCar);
  if (user) {
    user.name = cleanName;
    user.carNumber = cleanCar;
    user.vehicleType = cleanType;
    user.lastLogin = new Date().toISOString();
  } else {
    user = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      phone: cleanPhone,
      carNumber: cleanCar,
      vehicleType: cleanType,
      wallet_balance: 500.00,
      walletBalance: 500.00,
      role: 'driver',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    users.push(user);
  }
  saveUsers();

  const token = signToken({
    userId: user.id,
    phone: user.phone,
    carNumber: user.carNumber,
    name: user.name,
    role: user.role || 'driver'
  });

  res.json({
    success: true,
    message: 'Driver authenticated successfully (Memory fallback)',
    token,
    user: {
      ...user,
      walletBalance: parseFloat(user.wallet_balance || user.walletBalance || 500.00),
    },
  });
});

// Explicit registration endpoint (same robust validation)
app.post('/api/auth/register', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/auth/login', method: 'POST' }, res);
});

// Get currently authenticated driver profile & live balance from PostgreSQL
app.get('/api/auth/me', requireAuth, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// Google OAuth Sign-In & Registration
app.post('/api/auth/google', async (req, res) => {
  const { credential, phone, carNumber, vehicleType = 'compact' } = req.body;

  if (!credential) {
    return res.status(400).json({
      error: 'Google OAuth credential token (id_token) is required.',
      code: 'MISSING_CREDENTIAL'
    });
  }

  try {
    const googleUser = await verifyGoogleIdToken(credential);
    const email = googleUser.email;
    const name = googleUser.name;
    const avatarUrl = googleUser.picture;
    const googleId = googleUser.googleId;

    if (isDbConnected()) {
      // Check if user exists by google_id or email
      const userRes = await query(
        'SELECT * FROM users WHERE google_id = $1 OR (email IS NOT NULL AND email = $2) LIMIT 1',
        [googleId, email]
      );

      let userObj;
      if (userRes.rows.length > 0) {
        const existing = userRes.rows[0];
        const updated = await query(`
          UPDATE users
          SET google_id = $1, email = $2, avatar_url = $3, name = COALESCE($4, name), last_login = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *;
        `, [googleId, email, avatarUrl, name, existing.id]);
        userObj = updated.rows[0];
      } else {
        // Create new driver profile with Google identity
        const newUserId = `usr_g_${googleId.slice(-8)}_${Date.now().toString().slice(-4)}`;
        const defaultPhone = phone ? phone.trim().replace(/\D/g, '') : `98${Math.floor(10000000 + Math.random() * 90000000)}`;
        const defaultPlate = carNumber ? carNumber.trim().toUpperCase().replace(/\s+/g, '-') : `GJ-01-G-${Math.floor(1000 + Math.random() * 9000)}`;

        const inserted = await query(`
          INSERT INTO users (id, name, email, google_id, avatar_url, phone, car_number, vehicle_type, wallet_balance, role, created_at, last_login)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 500.00, 'driver', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *;
        `, [newUserId, name, email, googleId, avatarUrl, defaultPhone, defaultPlate, vehicleType]);
        userObj = inserted.rows[0];

        // Register default vehicle in vehicle_owners
        const vId = `vo_g_${Date.now()}`;
        await query(`
          INSERT INTO vehicle_owners (
            id, user_id, owner_name, email, phone, car_number, vehicle_type, wallet_balance, city_area, pass_type, verification_status, is_default, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 500.00, 'Ahmedabad', 'Daily Pass', 'municipal_demo_verified', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (car_number) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = CURRENT_TIMESTAMP;
        `, [vId, userObj.id, name, email, defaultPhone, defaultPlate, vehicleType]);
      }

      const token = signToken({
        userId: userObj.id,
        email: userObj.email,
        phone: userObj.phone,
        carNumber: userObj.car_number,
        role: userObj.role || 'driver'
      });

      return res.json({
        success: true,
        token,
        user: {
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          avatarUrl: userObj.avatar_url,
          phone: userObj.phone,
          carNumber: userObj.car_number,
          vehicleType: userObj.vehicle_type,
          walletBalance: parseFloat(userObj.wallet_balance || 500),
          role: userObj.role || 'driver',
          lastLogin: userObj.last_login
        }
      });
    }

    // JSON fallback
    let userObj = users.find(u => u.googleId === googleId || u.email === email);
    if (!userObj) {
      userObj = {
        id: `usr_g_${googleId.slice(-8)}`,
        name,
        email,
        googleId,
        avatarUrl,
        phone: phone || '9876543210',
        carNumber: carNumber || 'GJ-01-G-1100',
        vehicleType,
        walletBalance: 500,
        role: 'driver',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      users.push(userObj);
      saveUsers();
    }

    const token = signToken({
      userId: userObj.id,
      email: userObj.email,
      phone: userObj.phone,
      carNumber: userObj.carNumber,
      role: userObj.role || 'driver'
    });

    return res.json({ success: true, token, user: userObj });
  } catch (err) {
    console.error('[Google OAuth] Error verifying token:', err.message);
    return res.status(401).json({
      error: 'Google Sign-In failed: ' + err.message,
      code: 'GOOGLE_AUTH_FAILED'
    });
  }
});

// ============================================================
// VEHICLE MANAGEMENT & VERIFICATION API
// ============================================================

// 1. Get user's registered vehicles
app.get('/api/vehicles', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userPhone = req.user.phone;
  const userCar = req.user.carNumber;

  if (isDbConnected()) {
    try {
      const result = await query(`
        SELECT * FROM vehicle_owners
        WHERE user_id = $1 OR phone = $2 OR car_number = $3
        ORDER BY is_default DESC, created_at DESC;
      `, [userId, userPhone, userCar]);
      return res.json(result.rows);
    } catch (err) {
      console.error('[PostgreSQL] /api/vehicles error:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve registered vehicles.' });
    }
  }

  const list = vehicleOwners.filter(vo => vo.user_id === userId || vo.phone === userPhone || vo.car_number === userCar);
  res.json(list);
});

// 2. Add / Register a new vehicle for authenticated user
app.post('/api/vehicles', requireAuth, async (req, res) => {
  const { carNumber, vehicleType = 'compact', vehicleMake, vehicleModel, color, fuelType = 'Petrol', cityArea = 'Ahmedabad' } = req.body;
  if (!carNumber || typeof carNumber !== 'string') {
    return res.status(400).json({ error: 'Car / Vehicle plate number is required.' });
  }

  const cleanCar = carNumber.trim().toUpperCase().replace(/\s+/g, '-');
  // Gujarat/Indian plate normalization
  const plateRegex = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i;
  if (!plateRegex.test(cleanCar.replace(/-/g, ''))) {
    return res.status(400).json({
      error: 'Invalid vehicle registration format. Expected Gujarat RTO format like GJ-01-AB-1234.',
      code: 'INVALID_PLATE_FORMAT'
    });
  }

  const userId = req.user.id;
  const ownerName = req.user.name;
  const phone = req.user.phone;
  const email = req.user.email || null;

  if (isDbConnected()) {
    try {
      const vId = `vo_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const result = await query(`
        INSERT INTO vehicle_owners (
          id, user_id, owner_name, phone, email, car_number, vehicle_make, vehicle_model,
          vehicle_type, color, fuel_type, city_area, pass_type, verification_status,
          is_default, wallet_balance, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Daily Pass', 'pending_official_verification', false, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (car_number) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          owner_name = EXCLUDED.owner_name,
          phone = EXCLUDED.phone,
          vehicle_type = EXCLUDED.vehicle_type,
          vehicle_make = COALESCE(EXCLUDED.vehicle_make, vehicle_owners.vehicle_make),
          vehicle_model = COALESCE(EXCLUDED.vehicle_model, vehicle_owners.vehicle_model),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `, [vId, userId, ownerName, phone, email, cleanCar, vehicleMake || '', vehicleModel || '', vehicleType, color || '', fuelType, cityArea, req.user.walletBalance || 500]);

      return res.status(201).json({
        success: true,
        vehicle: result.rows[0],
        message: 'Vehicle added to your registry. Status: Pending Official MoRTH RTO Verification (Municipal Demo Mode).'
      });
    } catch (err) {
      console.error('[PostgreSQL] Add vehicle error:', err.message);
      return res.status(500).json({ error: 'Failed to add vehicle: ' + err.message });
    }
  }

  res.status(201).json({ success: true, message: 'Vehicle added in demo mode.' });
});

// 3. Set vehicle as default
app.put('/api/vehicles/:id/default', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (isDbConnected()) {
    try {
      await query('UPDATE vehicle_owners SET is_default = FALSE WHERE user_id = $1;', [userId]);
      const result = await query(`
        UPDATE vehicle_owners
        SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE (id = $1 OR car_number = $1) AND (user_id = $2 OR phone = $3)
        RETURNING *;
      `, [id, userId, req.user.phone]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found or not owned by you.' });
      }

      await query('UPDATE users SET car_number = $1, vehicle_type = $2 WHERE id = $3;', [result.rows[0].car_number, result.rows[0].vehicle_type, userId]);

      return res.json({ success: true, vehicle: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to set default vehicle: ' + err.message });
    }
  }
  res.json({ success: true });
});

// 4. Delete vehicle from user registry
app.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (isDbConnected()) {
    try {
      const result = await query(`
        DELETE FROM vehicle_owners
        WHERE (id = $1 OR car_number = $1) AND (user_id = $2 OR phone = $3)
        RETURNING *;
      `, [id, userId, req.user.phone]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found or not authorized to delete.' });
      }

      // If the active vehicle was removed, switch the profile to another registered vehicle
      if (result.rows[0].car_number === req.user.carNumber) {
        const next = await query(
          'SELECT * FROM vehicle_owners WHERE user_id = $1 OR phone = $2 ORDER BY is_default DESC, created_at DESC LIMIT 1;',
          [userId, req.user.phone]
        );
        if (next.rows.length > 0) {
          const nextVehicle = next.rows[0];
          await query('UPDATE vehicle_owners SET is_default = (id = $1) WHERE user_id = $2;', [nextVehicle.id, userId]);
          await query('UPDATE users SET car_number = $1, vehicle_type = $2 WHERE id = $3;', [nextVehicle.car_number, nextVehicle.vehicle_type, userId]);
        }
      }

      return res.json({ success: true, message: 'Vehicle removed from your registry.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete vehicle.' });
    }
  }
  res.json({ success: true });
});

// ============================================================
// ADMIN APIS (ROLE RESTRICTED TO ADMIN)
// ============================================================

// Admin Overview
app.get('/api/admin/overview', requireAuth, requireAdmin, async (req, res) => {
  if (isDbConnected()) {
    try {
      const locStats = await query('SELECT COUNT(*)::int AS count FROM locations');
      const slotStats = await query(`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'available')::int AS available,
          COUNT(*) FILTER (WHERE status = 'occupied')::int AS occupied
        FROM parking_slots
      `);
      const bookingStats = await query(`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
        FROM bookings
      `);
      const revenueStats = await query(`
        SELECT COALESCE(SUM(r.total_amount - COALESCE(b.refund_amount, 0)), 0)::float AS total_revenue
        FROM receipts r LEFT JOIN bookings b ON b.booking_id = r.booking_id
      `);
      const userStats = await query('SELECT COUNT(*)::int AS users_count FROM users');

      return res.json({
        locationsCount: locStats.rows[0].count,
        slots: slotStats.rows[0],
        bookings: bookingStats.rows[0],
        totalRevenue: revenueStats.rows[0].total_revenue,
        usersCount: userStats.rows[0].users_count,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ error: 'Admin query failed: ' + err.message });
    }
  }
  res.json({ message: 'Admin overview in memory mode' });
});

// Admin All Bookings
app.get('/api/admin/bookings', requireAuth, requireAdmin, async (req, res) => {
  if (isDbConnected()) {
    try {
      const { status } = req.query;
      let sql = `
        SELECT b.*, l.name AS location_name, l.area AS location_area
        FROM bookings b
        JOIN locations l ON b.location_id = l.id
      `;
      const params = [];
      if (status && status !== 'all') {
        sql += ' WHERE b.status = $1';
        params.push(status);
      }
      sql += ' ORDER BY b.created_at DESC LIMIT 100;';

      const result = await query(sql, params);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve admin bookings.' });
    }
  }
  res.json(bookings);
});

// Admin Add Location
app.post('/api/admin/locations', requireAuth, requireAdmin, async (req, res) => {
  const { id, name, area, address, lat, lng, hourlyRate = 30 } = req.body;
  if (!name || !area || !lat || !lng) {
    return res.status(400).json({ error: 'Name, area, lat, and lng are required.' });
  }

  const locId = id || `loc-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

  if (isDbConnected()) {
    try {
      await query(`
        INSERT INTO locations (id, name, area, address, lat, lng, rating, hourly_rate, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 4.8, $7, '₹', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          area = EXCLUDED.area,
          address = EXCLUDED.address,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          hourly_rate = EXCLUDED.hourly_rate,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `, [locId, name, area, address || `${name}, ${area}, Ahmedabad`, lat, lng, hourlyRate]);

      const newSlots = generateSlotsFromDataset(locId, name, hourlyRate);
      for (const s of newSlots) {
        const slotDbId = `${locId}_${s.id}`;
        await query(`
          INSERT INTO parking_slots (
            id, location_id, slot_code, spot_number, zone, slot_type, status, spot_size
          ) VALUES ($1, $2, $3, $4, $5, $6, 'available', 'Standard')
          ON CONFLICT (id) DO NOTHING;
        `, [slotDbId, locId, s.id, s.spotNumber || 1, s.zone || 'A', s.type || 'compact']);
      }

      return res.status(201).json({ success: true, message: `Municipal parking location ${name} added!` });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add location: ' + err.message });
    }
  }
  res.status(201).json({ success: true });
});

// Dev helper: Toggle testing role to admin for the current user in development
app.post('/api/admin/toggle-my-role', requireAuth, async (req, res) => {
  const newRole = req.user.role === 'admin' ? 'driver' : 'admin';
  if (isDbConnected()) {
    await query('UPDATE users SET role = $1 WHERE id = $2;', [newRole, req.user.id]);
  }
  const token = signToken({
    userId: req.user.id,
    email: req.user.email,
    phone: req.user.phone,
    carNumber: req.user.carNumber,
    role: newRole
  });
  res.json({ success: true, role: newRole, token });
});

// ============================================================
// SMART MOBILITY DIGITAL WALLET API (ACID LEDGER)
// ============================================================

// Get authenticated driver's Smart Wallet balance and transactions
app.get('/api/wallet/balance', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userCar = req.user.carNumber;

  if (isDbConnected()) {
    try {
      const uRes = await query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
      const balance = uRes.rows.length > 0 ? parseFloat(uRes.rows[0].wallet_balance) : req.user.walletBalance;

      const txRes = await query(
        'SELECT * FROM wallet_transactions WHERE user_id = $1 OR car_number = $2 ORDER BY created_at DESC LIMIT 20;',
        [userId, userCar]
      );

      return res.json({
        success: true,
        balance,
        transactions: txRes.rows,
        database: 'PostgreSQL 16 (Live)'
      });
    } catch (err) {
      console.error('[PostgreSQL] /api/wallet/balance error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch wallet details' });
    }
  }

  // Fallback to memory
  const u = users.find(u => u.id === userId);
  const balance = u ? parseFloat(u.wallet_balance || u.walletBalance || 500.00) : 500.00;
  const txs = walletTransactions.filter(t => t.user_id === userId || t.car_number === userCar);

  res.json({
    success: true,
    balance,
    transactions: txs,
    database: 'Memory Cache / JSON Dataset'
  });
});

// Smart Wallet Recharge / Top-Up (ACID Transaction)
app.post('/api/wallet/topup', requireAuth, async (req, res) => {
  const { amount, paymentMethod = 'UPI', idempotencyKey } = req.body;
  const numAmount = Number(parseFloat(amount).toFixed(2));

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please specify a valid top-up amount greater than 0.' });
  }
  if (numAmount > 50000) {
    return res.status(400).json({ error: 'Maximum single top-up limit is ₹50,000.' });
  }

  const userId = req.user.id;
  const cleanCar = req.user.carNumber;
  const cleanPhone = req.user.phone;
  const txRef = idempotencyKey || `RECHARGE-${Date.now().toString().slice(-8)}`;

  if (isDbConnected()) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check idempotency if key was passed
      if (idempotencyKey) {
        const existTx = await client.query(
          'SELECT * FROM wallet_transactions WHERE reference_id = $1 LIMIT 1',
          [idempotencyKey]
        );
        if (existTx.rows.length > 0) {
          await client.query('ROLLBACK');
          const uRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
          return res.json({
            success: true,
            message: 'Transaction already completed (Idempotent)',
            newBalance: parseFloat(uRes.rows[0].wallet_balance),
            transaction: existTx.rows[0]
          });
        }
      }

      // Lock user row
      const userRes = await client.query(
        'SELECT id, wallet_balance FROM users WHERE id = $1 FOR UPDATE;',
        [userId]
      );

      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User wallet record not found.' });
      }

      const curBal = parseFloat(userRes.rows[0].wallet_balance || 0);
      const newBalance = Number((curBal + numAmount).toFixed(2));

      await client.query(
        'UPDATE users SET wallet_balance = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2;',
        [newBalance, userId]
      );

      // Sync vehicle_owners if exists
      await client.query(
        'UPDATE vehicle_owners SET wallet_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE car_number = $2 OR phone = $3;',
        [newBalance, cleanCar, cleanPhone]
      );

      const txId = `WTX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Insert transaction ledger record
      const insertTxRes = await client.query(`
        INSERT INTO wallet_transactions (
          id, user_id, car_number, type, amount, description, reference_id, balance_after, created_at
        ) VALUES ($1, $2, $3, 'CREDIT', $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *;
      `, [
        txId,
        userId,
        cleanCar,
        numAmount,
        `Smart Wallet Recharge via ${paymentMethod.toUpperCase()}`,
        txRef,
        newBalance
      ]);

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: `₹${numAmount.toFixed(2)} added to Smart Wallet! New Balance: ₹${newBalance.toFixed(2)}`,
        newBalance,
        transaction: insertTxRes.rows[0],
        database: 'PostgreSQL 16 (Live ACID Transaction)'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] /api/wallet/topup error:', err.message);
      return res.status(500).json({ error: 'Failed to process wallet top-up: ' + err.message });
    } finally {
      client.release();
    }
  }

  // Fallback to memory
  let u = users.find(u => u.id === userId);
  let curBal = u ? parseFloat(u.wallet_balance || u.walletBalance || 500.00) : 500.00;
  let newBalance = Number((curBal + numAmount).toFixed(2));
  if (u) {
    u.wallet_balance = newBalance;
    u.walletBalance = newBalance;
  }

  const tx = {
    id: `WTX-${Date.now().toString().slice(-6)}`,
    user_id: userId,
    car_number: cleanCar,
    type: 'CREDIT',
    amount: numAmount,
    description: `Smart Wallet Recharge via ${paymentMethod.toUpperCase()}`,
    reference_id: txRef,
    balance_after: newBalance,
    created_at: new Date().toISOString()
  };
  walletTransactions.unshift(tx);
  saveUsers();
  saveWalletTransactions();

  res.json({
    success: true,
    message: `₹${numAmount.toFixed(2)} added to Smart Wallet! New Balance: ₹${newBalance.toFixed(2)}`,
    newBalance,
    transaction: tx,
    database: 'Memory Cache / JSON Dataset'
  });
});

// ============================================================
// GATE ARRIVAL VERIFICATION API ("Verify if I have came")
// ============================================================

app.get('/api/gate/status', (req, res) => {
  res.json({
    activeGates: [
      { id: 'gate-a1', name: 'Gate A1 - North Entrance Barrier', status: 'ONLINE', rfidActive: true, anprActive: true },
      { id: 'gate-b2', name: 'Gate B2 - South VIP / EV Barrier', status: 'ONLINE', rfidActive: true, anprActive: true }
    ],
    rfidScannerStatus: 'ONLINE • Fastag Ready',
    barrierState: 'CLOSED_ARMED'
  });
});

app.post('/api/gate/verify-arrival', optionalAuth, async (req, res) => {
  const { locationId, carNumber, phone, driverName, gateId = 'Gate A1 - North Barrier' } = req.body;

  const cleanCar = (req.user?.carNumber || carNumber || '').trim().toUpperCase();
  const cleanPhone = (req.user?.phone || phone || '').trim();
  const cleanDriver = (req.user?.name || driverName || 'Driver').trim();

  if (!cleanCar || !cleanPhone) {
    return res.status(400).json({ error: 'Vehicle Plate and Phone Number are required to verify gate arrival.' });
  }

  const arrivalToken = `ARR-GATE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const checkinTime = new Date();

  return res.json({
    success: true,
    verified: true,
    arrivalToken,
    gateId,
    locationId: locationId || 'loc-cg-road',
    carNumber: cleanCar,
    driverName: cleanDriver,
    phone: cleanPhone,
    checkinTime: checkinTime.toISOString(),
    fastagStatus: 'ACTIVE & SCANNED',
    rfidDetected: true,
    barrierStatus: 'ARMED - AWAITING TARIFF PREPAYMENT',
    message: `Physical Arrival Verified! Vehicle ${cleanCar} is present at ${gateId}. Clearance granted to proceed with wallet prepayment.`
  });
});

// ============================================================
// BOOKINGS & SMART PARKING WORKFLOW
// Upfront Smart Wallet Payment, Row-Level Locking & Bay Allotment
// ============================================================

app.post('/api/bookings/prepay-and-park', requireAuth, async (req, res) => {
  const {
    locationId,
    slotId,
    durationHours = 2,
    arrivalToken,
    gateId = 'Gate A1 - North Barrier',
    idempotencyKey
  } = req.body;

  if (!locationId || !slotId) {
    return res.status(400).json({ error: 'locationId and slotId are required' });
  }

  // Derive driver identity strictly from verified session
  const cleanCar = req.user.carNumber;
  const cleanPhone = req.user.phone;
  const cleanDriver = req.user.name;
  const cleanType = req.user.vehicleType || 'compact';
  const userId = req.user.id;

  const duration = Math.min(24, Math.max(1, parseInt(durationHours, 10) || 2));

  // Normalize slot ID
  const cleanSlotCode = slotId.startsWith(locationId + '_') ? slotId.replace(locationId + '_', '') : slotId;
  const slotDbId = `${locationId}_${cleanSlotCode}`;

  if (isDbConnected()) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Idempotency Check
      if (idempotencyKey) {
        const existBk = await client.query(
          'SELECT * FROM bookings WHERE idempotency_key = $1 LIMIT 1',
          [idempotencyKey]
        );
        if (existBk.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.json({
            success: true,
            message: 'Booking request already processed (Idempotent)',
            booking: existBk.rows[0]
          });
        }
      }

      // 2. Fetch Location & Tariff
      const locRes = await client.query('SELECT * FROM locations WHERE id = $1', [locationId]);
      if (locRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Location not found' });
      }
      const loc = locRes.rows[0];
      const hourlyRate = parseFloat(loc.hourly_rate);
      const subtotal = Number((hourlyRate * duration).toFixed(2));
      const tax = Number((subtotal * 0.05).toFixed(2));
      const totalAmount = Number((subtotal + tax).toFixed(2));

      // 3. Atomically Lock and Check Parking Slot
      const slotRes = await client.query(
        'SELECT * FROM parking_slots WHERE id = $1 FOR UPDATE;',
        [slotDbId]
      );
      if (slotRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Slot ${cleanSlotCode} not found at this facility.` });
      }
      const slotRow = slotRes.rows[0];
      if (slotRow.status === 'occupied') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Bay ${cleanSlotCode} is currently occupied. Please choose an available bay.` });
      }

      // Check if this slot already has an active booking in the database
      const activeSlotBooking = await client.query(
        "SELECT booking_id FROM bookings WHERE slot_id = $1 AND status = 'active' FOR UPDATE;",
        [slotDbId]
      );
      if (activeSlotBooking.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Bay ${cleanSlotCode} is currently reserved by another driver.` });
      }

      // 4. Atomically Lock and Verify Authenticated User's Wallet Balance
      const userRes = await client.query(
        'SELECT id, wallet_balance FROM users WHERE id = $1 FOR UPDATE;',
        [userId]
      );
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User account not found.' });
      }

      const currentBalance = parseFloat(userRes.rows[0].wallet_balance || 0);

      // Insufficient Funds Guard: Leave database 100% unchanged on failure
      if (currentBalance < totalAmount) {
        await client.query('ROLLBACK');
        return res.status(402).json({
          error: `Insufficient Wallet Balance: Current balance is ₹${currentBalance.toFixed(2)}, but ₹${totalAmount.toFixed(2)} is required (₹${subtotal} + 5% GST ₹${tax}) for ${duration} hours parking. Please recharge your wallet first.`,
          requiredAmount: totalAmount,
          currentBalance,
          deficit: Number((totalAmount - currentBalance).toFixed(2)),
          needsTopup: true
        });
      }

      // 5. Deduct Prepaid Tariff from User & Vehicle Owner Wallet in PostgreSQL
      const remainingBalance = Number((currentBalance - totalAmount).toFixed(2));
      await client.query('UPDATE users SET wallet_balance = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2;', [remainingBalance, userId]);
      await client.query('UPDATE vehicle_owners SET wallet_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE car_number = $2;', [remainingBalance, cleanCar]);

      // 6. Insert Wallet Transaction Ledger Entry
      const txId = `WTX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const bookingId = `BK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const receiptId = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const now = new Date();

      await client.query(`
        INSERT INTO wallet_transactions (
          id, user_id, car_number, type, amount, description, reference_id, balance_after, created_at
        ) VALUES ($1, $2, $3, 'DEBIT', $4, $5, $6, $7, CURRENT_TIMESTAMP);
      `, [
        txId,
        userId,
        cleanCar,
        totalAmount,
        `Prepaid Parking Fee: Bay ${cleanSlotCode} (${duration} hrs at ${loc.name})`,
        bookingId,
        remainingBalance
      ]);

      // 7. Update Parking Slot to Occupied
      const battery = cleanType === 'ev' ? 85 : null;
      await client.query(`
        UPDATE parking_slots
        SET status = 'occupied',
            current_plate = $1,
            current_driver = $2,
            current_phone = $3,
            parked_at = $4,
            battery_level = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6;
      `, [cleanCar, cleanDriver, cleanPhone, now, battery, slotDbId]);

      // 8. Insert Booking with Verification & Payment Status
      await client.query(`
        INSERT INTO bookings (
          booking_id, user_id, location_id, slot_id, plate, driver_name, phone,
          vehicle_type, hourly_rate, booked_duration_hours, status, parked_at,
          checkin_verified, checkin_method, checkin_time, payment_status, idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, true, $12, $13, 'PAID_WALLET', $14);
      `, [
        bookingId,
        userId,
        locationId,
        slotDbId,
        cleanCar,
        cleanDriver,
        cleanPhone,
        cleanType,
        hourlyRate,
        duration,
        now,
        `FASTag RFID Barrier (${gateId})`,
        now,
        idempotencyKey || null
      ]);

      // 9. Insert Fiscal Receipt for Prepayment
      await client.query(`
        INSERT INTO receipts (
          receipt_id, booking_id, subtotal, tax, total_amount,
          payment_method, payment_status, duration_text, billed_hours, paid_at
        )
        VALUES ($1, $2, $3, $4, $5, 'SMART_WALLET', 'PAID', $6, $7, $8);
      `, [
        receiptId,
        bookingId,
        subtotal,
        tax,
        totalAmount,
        `${duration} hr prepaid reservation`,
        duration,
        now
      ]);

      await client.query('COMMIT');

      const booking = {
        bookingId,
        userId,
        locationId: loc.id,
        locationName: loc.name,
        locationArea: loc.area,
        slotId: cleanSlotCode,
        zone: slotRow.zone,
        slotType: slotRow.slot_type,
        plate: cleanCar,
        driver: cleanDriver,
        phone: cleanPhone,
        vehicleType: cleanType,
        hourlyRate,
        currency: loc.currency || '₹',
        bookedDurationHours: duration,
        parkedAt: now.getTime(),
        status: 'active',
        checkinVerified: true,
        checkinMethod: `FASTag RFID Barrier (${gateId})`,
        paymentStatus: 'PAID_WALLET',
        prepaidAmount: totalAmount,
      };

      const updatedSlot = {
        id: cleanSlotCode,
        dbId: slotDbId,
        spotNumber: slotRow.spot_number,
        zone: slotRow.zone,
        type: slotRow.slot_type,
        status: 'occupied',
        vehicle: {
          plate: cleanCar,
          driver: cleanDriver,
          phone: cleanPhone,
          type: cleanType,
          parkedAt: now.getTime(),
          batteryLevel: battery,
        },
      };

      const receipt = {
        receiptId,
        locationName: loc.name,
        locationArea: loc.area,
        slotId: cleanSlotCode,
        zone: slotRow.zone,
        plate: cleanCar,
        driver: cleanDriver,
        phone: cleanPhone,
        vehicleType: cleanType,
        entryTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        exitTime: new Date(now.getTime() + duration * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        durationText: `${duration} hour prepaid parking`,
        hourlyRate,
        subtotal,
        tax,
        totalAmount,
        paymentMethod: 'SMART_WALLET',
        date: now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      return res.status(201).json({
        success: true,
        bookingId,
        barrierOpened: true,
        message: `Arrival Verified & ₹${totalAmount.toFixed(2)} deducted from Smart Wallet! Boom Barrier opened. Bay ${cleanSlotCode} allotted to ${cleanCar}.`,
        booking,
        slot: updatedSlot,
        receipt,
        remainingBalance,
        receiptId,
        database: 'PostgreSQL 16 (Full ACID Transaction with Row-Level Lock)'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Prepay-and-park transaction error:', err.message);
      if (err.message && err.message.includes('idx_unique_active_slot_booking')) {
        return res.status(409).json({ error: `Bay ${cleanSlotCode} was just booked by another user. Please select another bay.` });
      }
      return res.status(500).json({ error: 'Transaction failed: ' + err.message });
    } finally {
      client.release();
    }
  }

  // Fallback to memory
  const loc = locations.find(l => l.id === locationId);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  const slot = loc.slots.find(s => s.id === cleanSlotCode);
  if (!slot) return res.status(404).json({ error: 'Slot not found in this location' });
  if (slot.status === 'occupied') return res.status(409).json({ error: 'Bay occupied' });

  const hourlyRate = loc.hourlyRate || 30;
  const subtotal = Number((hourlyRate * duration).toFixed(2));
  const tax = Number((subtotal * 0.05).toFixed(2));
  const totalAmount = Number((subtotal + tax).toFixed(2));

  let u = users.find(u => u.id === userId);
  let curBal = u ? parseFloat(u.wallet_balance || u.walletBalance || 500) : 500;

  if (curBal < totalAmount) {
    return res.status(402).json({
      error: `Insufficient Wallet Balance: You have ₹${curBal.toFixed(2)}, but ₹${totalAmount.toFixed(2)} is required.`,
      requiredAmount: totalAmount,
      currentBalance: curBal,
      deficit: Number((totalAmount - curBal).toFixed(2)),
      needsTopup: true
    });
  }

  const remainingBalance = Number((curBal - totalAmount).toFixed(2));
  if (u) {
    u.wallet_balance = remainingBalance;
    u.walletBalance = remainingBalance;
  }

  const bookingId = `BK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const nowMs = Date.now();
  slot.status = 'occupied';
  slot.vehicle = {
    plate: cleanCar,
    driver: cleanDriver,
    phone: cleanPhone,
    type: cleanType,
    parkedAt: nowMs,
    batteryLevel: cleanType === 'ev' ? 85 : null,
  };

  const booking = {
    bookingId,
    userId,
    locationId: loc.id,
    locationName: loc.name,
    locationArea: loc.area,
    slotId: slot.id,
    zone: slot.zone,
    slotType: slot.type,
    plate: cleanCar,
    driver: cleanDriver,
    phone: cleanPhone,
    vehicleType: cleanType,
    hourlyRate,
    currency: loc.currency || '₹',
    bookedDurationHours: duration,
    parkedAt: nowMs,
    status: 'active',
    checkinVerified: true,
    checkinMethod: `FASTag RFID Barrier (${gateId})`,
    paymentStatus: 'PAID_WALLET',
    prepaidAmount: totalAmount,
  };

  bookings.unshift(booking);
  walletTransactions.unshift({
    id: `WTX-${Date.now().toString().slice(-6)}`,
    user_id: userId,
    car_number: cleanCar,
    type: 'DEBIT',
    amount: totalAmount,
    description: `Prepaid Parking Fee: Bay ${slot.id} (${duration} hrs at ${loc.name})`,
    reference_id: bookingId,
    balance_after: remainingBalance,
    created_at: new Date().toISOString()
  });

  saveLocations();
  saveBookings();
  saveUsers();
  saveWalletTransactions();

  res.status(201).json({
    success: true,
    barrierOpened: true,
    message: `Arrival Verified & ₹${totalAmount} deducted from Smart Wallet! Barrier opened. Bay ${slot.id} allotted.`,
    booking,
    slot,
    remainingBalance,
    database: 'Memory Cache / JSON Dataset'
  });
});

// Legacy booking endpoint (redirects to authenticated prepay-and-park flow)
app.post('/api/bookings/book', requireAuth, async (req, res) => {
  return app._router.handle({ ...req, url: '/api/bookings/prepay-and-park', method: 'POST' }, res);
});

// ============================================================
// CANCELLATION & REFUND API
// Business Rule: Active prepaid booking can be cancelled by owner or admin.
// Atomically releases slot and refunds prepaid amount to wallet.
// ============================================================

// Bookings cancelled within this window are refunded in full
const FREE_CANCEL_MINUTES = 15;

app.post('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userCar = req.user.carNumber;
  const isAdmin = req.user.role === 'admin';

  if (isDbConnected()) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch and Lock Booking
      const bkRes = await client.query(
        'SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE;',
        [id]
      );
      if (bkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Booking reservation not found.' });
      }

      const booking = bkRes.rows[0];

      // 2. Ownership Check
      const isOwner = (booking.user_id && booking.user_id === userId) || (booking.plate === userCar);
      if (!isOwner && !isAdmin) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Access Denied: You are not authorized to cancel this booking.' });
      }

      // 3. Status Check: Must be active
      if (booking.status !== 'active') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cannot cancel: Booking is already ${booking.status}.` });
      }

      // 4. Calculate Refund Amount
      let refundAmount = 0;
      const rcpRes = await client.query('SELECT total_amount FROM receipts WHERE booking_id = $1;', [booking.booking_id]);
      let paidAmount;
      if (rcpRes.rows.length > 0) {
        paidAmount = parseFloat(rcpRes.rows[0].total_amount);
      } else {
        const subtotal = parseFloat(booking.hourly_rate) * (booking.booked_duration_hours || 2);
        paidAmount = Number((subtotal * 1.05).toFixed(2));
      }
      // Full refund within the free-cancellation window; afterwards only unused prepaid hours
      const usedMinutes = booking.parked_at ? Math.max(0, (Date.now() - new Date(booking.parked_at).getTime()) / 60000) : 0;
      if (usedMinutes <= FREE_CANCEL_MINUTES) {
        refundAmount = paidAmount;
      } else {
        const usedHours = Math.ceil(usedMinutes / 60);
        const usedCost = Number((usedHours * parseFloat(booking.hourly_rate) * 1.05).toFixed(2));
        refundAmount = Math.max(0, Number((paidAmount - usedCost).toFixed(2)));
      }

      // 5. Credit User Wallet in PostgreSQL
      const bookingUserId = booking.user_id || userId;
      const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE;', [bookingUserId]);
      let newBalance = refundAmount;
      if (userRes.rows.length > 0) {
        const curBal = parseFloat(userRes.rows[0].wallet_balance || 0);
        newBalance = Number((curBal + refundAmount).toFixed(2));
        await client.query('UPDATE users SET wallet_balance = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2;', [newBalance, bookingUserId]);
        await client.query('UPDATE vehicle_owners SET wallet_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE car_number = $2;', [newBalance, booking.plate]);
      }

      // 6. Record Audit Trail in wallet_transactions
      const txId = `WTX-REF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      await client.query(`
        INSERT INTO wallet_transactions (
          id, user_id, car_number, type, amount, description, reference_id, balance_after, created_at
        ) VALUES ($1, $2, $3, 'CREDIT', $4, $5, $6, $7, CURRENT_TIMESTAMP);
      `, [
        txId,
        bookingUserId,
        booking.plate,
        refundAmount,
        `Refund for Cancelled Reservation: Booking ${booking.booking_id}`,
        `REFUND-${booking.booking_id}`,
        newBalance
      ]);

      // 7. Update Booking Status to Cancelled
      await client.query(`
        UPDATE bookings
        SET status = 'cancelled', payment_status = 'REFUNDED', exit_time = CURRENT_TIMESTAMP,
            refund_amount = $2, cancelled_at = CURRENT_TIMESTAMP
        WHERE booking_id = $1;
      `, [booking.booking_id, refundAmount]);

      // 8. Atomically Free the Parking Slot
      await client.query(`
        UPDATE parking_slots
        SET status = 'available',
            current_plate = NULL,
            current_driver = NULL,
            current_phone = NULL,
            parked_at = NULL,
            battery_level = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `, [booking.slot_id]);

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: `Booking ${booking.booking_id} cancelled. ₹${refundAmount.toFixed(2)} refunded to your Smart Wallet. Bay is now available again.`,
        refundAmount,
        newBalance,
        bookingId: booking.booking_id
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Cancel booking error:', err.message);
      return res.status(500).json({ error: 'Failed to cancel booking: ' + err.message });
    } finally {
      client.release();
    }
  }

  // Fallback to memory
  const bk = bookings.find(b => b.bookingId === id);
  if (!bk) return res.status(404).json({ error: 'Booking not found' });
  if (bk.status !== 'active') return res.status(400).json({ error: `Booking is already ${bk.status}` });

  const refundAmount = bk.prepaidAmount || 63.00;
  let u = users.find(u => u.id === userId);
  let newBalance = u ? (parseFloat(u.wallet_balance || 500) + refundAmount) : 500;
  if (u) u.wallet_balance = newBalance;

  bk.status = 'cancelled';
  bk.paymentStatus = 'REFUNDED';
  bk.exitTime = Date.now();

  const loc = locations.find(l => l.id === bk.locationId);
  if (loc) {
    const slot = loc.slots.find(s => s.id === bk.slotId);
    if (slot) {
      slot.status = 'available';
      slot.vehicle = null;
    }
  }

  saveBookings();
  saveLocations();
  saveUsers();

  res.json({
    success: true,
    message: `Booking ${bk.bookingId} cancelled. ₹${refundAmount} refunded.`,
    refundAmount,
    newBalance
  });
});

// ============================================================
// CHECKOUT & BAY RELEASE API
// Atomically concludes parking session, updates status, and makes slot reusable
// ============================================================

app.post('/api/bookings/checkout', requireAuth, async (req, res) => {
  const { locationId, slotId, bookingId, paymentMethod = 'SMART_WALLET' } = req.body;

  const userId = req.user.id;
  const userCar = req.user.carNumber;
  const isAdmin = req.user.role === 'admin';

  if (!bookingId && (!locationId || !slotId)) {
    return res.status(400).json({ error: 'Either bookingId or (locationId and slotId) is required' });
  }

  // Normalize slot ID
  const cleanSlotCode = slotId ? (slotId.startsWith(locationId + '_') ? slotId.replace(locationId + '_', '') : slotId) : null;
  const slotDbId = locationId && cleanSlotCode ? `${locationId}_${cleanSlotCode}` : null;

  if (isDbConnected()) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Locate active booking
      let bkRes;
      if (bookingId) {
        bkRes = await client.query('SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE;', [bookingId]);
      } else {
        bkRes = await client.query(
          "SELECT * FROM bookings WHERE location_id = $1 AND slot_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;",
          [locationId, slotDbId]
        );
      }

      if (bkRes.rows.length === 0) {
        // Fallback: check if slot itself is occupied
        const slotCheck = await client.query('SELECT * FROM parking_slots WHERE id = $1 FOR UPDATE;', [slotDbId]);
        if (slotCheck.rows.length === 0 || slotCheck.rows[0].status !== 'occupied') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Bay is not currently occupied.' });
        }

        const slotRow = slotCheck.rows[0];
        // Enforce ownership
        if (slotRow.current_plate !== userCar && !isAdmin) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Access Denied: You can only release your own parked vehicle.' });
        }

        // Release slot directly
        await client.query(`
          UPDATE parking_slots
          SET status = 'available',
              current_plate = NULL,
              current_driver = NULL,
              current_phone = NULL,
              parked_at = NULL,
              battery_level = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [slotDbId]);

        await client.query('COMMIT');
        return res.json({
          success: true,
          message: `Bay ${cleanSlotCode} released successfully.`,
        });
      }

      const booking = bkRes.rows[0];

      // 2. Ownership Check
      const isOwner = (booking.user_id && booking.user_id === userId) || (booking.plate === userCar);
      if (!isOwner && !isAdmin) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Access Denied: You can only release your own parked vehicle.' });
      }

      if (booking.status !== 'active') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Booking is already ${booking.status}.` });
      }

      const now = new Date();
      const entryTime = booking.parked_at ? new Date(booking.parked_at).getTime() : (now.getTime() - 60 * 60 * 1000);
      const diffMs = Math.max(0, now.getTime() - entryTime);
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      const billedHours = Math.max(1, Math.ceil(diffMins / 60));

      // 3. Mark booking as completed
      await client.query(`
        UPDATE bookings
        SET status = 'completed', exit_time = $1
        WHERE booking_id = $2;
      `, [now, booking.booking_id]);

      // 4. Update or Insert Fiscal Receipt (Avoiding duplicate key violations)
      const rcpCheck = await client.query('SELECT * FROM receipts WHERE booking_id = $1;', [booking.booking_id]);
      let receipt;
      let overstayCharge = 0;

      if (rcpCheck.rows.length > 0) {
        // Prepaid booking: charge only for hours beyond the prepaid duration
        const existingRcp = rcpCheck.rows[0];
        const hourlyRate = parseFloat(booking.hourly_rate) || 30;
        const prepaidHours = parseInt(booking.booked_duration_hours, 10) || parseInt(existingRcp.billed_hours, 10) || 1;
        const overstayHours = Math.max(0, billedHours - prepaidHours);
        const overstaySubtotal = Number((overstayHours * hourlyRate).toFixed(2));
        const overstayTax = Number((overstaySubtotal * 0.05).toFixed(2));
        overstayCharge = Number((overstaySubtotal + overstayTax).toFixed(2));

        if (overstayCharge > 0 && booking.user_id) {
          const balRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE;', [booking.user_id]);
          if (balRes.rows.length > 0) {
            const newBalance = Number((parseFloat(balRes.rows[0].wallet_balance || 0) - overstayCharge).toFixed(2));
            await client.query('UPDATE users SET wallet_balance = $1 WHERE id = $2;', [newBalance, booking.user_id]);
            await client.query('UPDATE vehicle_owners SET wallet_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE car_number = $2;', [newBalance, booking.plate]);
            await client.query(`
              INSERT INTO wallet_transactions (
                id, user_id, car_number, type, amount, description, reference_id, balance_after, created_at
              ) VALUES ($1, $2, $3, 'DEBIT', $4, $5, $6, $7, CURRENT_TIMESTAMP);
            `, [
              `WTX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
              booking.user_id, booking.plate, overstayCharge,
              `Overstay Charge: ${overstayHours} extra hr beyond ${prepaidHours} hr prepaid`,
              booking.booking_id, newBalance
            ]);
          }
        }

        const updateRcp = await client.query(`
          UPDATE receipts
          SET duration_text = $1,
              billed_hours = $2,
              subtotal = subtotal + $3,
              tax = tax + $4,
              total_amount = total_amount + $5
          WHERE booking_id = $6
          RETURNING *;
        `, [
          `${hours}h ${minutes}m (${prepaidHours} hr prepaid${overstayHours > 0 ? ` + ${overstayHours} hr overstay` : ''})`,
          Math.max(prepaidHours, billedHours), overstaySubtotal, overstayTax, overstayCharge, booking.booking_id
        ]);
        receipt = updateRcp.rows[0];
      } else {
        const hourlyRate = parseFloat(booking.hourly_rate) || 30;
        const subtotal = billedHours * hourlyRate;
        const tax = Number((subtotal * 0.05).toFixed(2));
        const totalAmount = Number((subtotal + tax).toFixed(2));
        const receiptId = `RCP-AHM-${Math.floor(100000 + Math.random() * 900000)}`;

        const insRcp = await client.query(`
          INSERT INTO receipts (
            receipt_id, booking_id, subtotal, tax, total_amount,
            payment_method, payment_status, duration_text, billed_hours, paid_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'PAID', $7, $8, $9)
          RETURNING *;
        `, [
          receiptId, booking.booking_id, subtotal, tax, totalAmount,
          paymentMethod.toUpperCase(), `${hours}h ${minutes}m (${billedHours} hr billed)`,
          billedHours, now
        ]);
        receipt = insRcp.rows[0];
      }

      // 5. Free Parking Slot
      await client.query(`
        UPDATE parking_slots
        SET status = 'available',
            current_plate = NULL,
            current_driver = NULL,
            current_phone = NULL,
            parked_at = NULL,
            battery_level = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `, [booking.slot_id]);

      const metaRes = await client.query(
        'SELECT l.name AS location_name, s.zone FROM parking_slots s JOIN locations l ON l.id = s.location_id WHERE s.id = $1;',
        [booking.slot_id]
      );
      const meta = metaRes.rows[0] || {};

      await client.query('COMMIT');

      const receiptData = {
        receiptId: receipt.receipt_id,
        locationName: meta.location_name,
        zone: meta.zone,
        subtotal: parseFloat(receipt.subtotal),
        tax: parseFloat(receipt.tax),
        bookingId: booking.booking_id,
        plate: booking.plate,
        driver: booking.driver_name,
        phone: booking.phone,
        slotId: cleanSlotCode,
        entryTime: new Date(entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        exitTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        durationText: `${hours}h ${minutes}m`,
        totalAmount: parseFloat(receipt.total_amount),
        overstayCharge,
        paymentMethod: receipt.payment_method,
        date: now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      return res.json({
        success: true,
        message: overstayCharge > 0
          ? `Bay ${cleanSlotCode} released. Overstay charge of ₹${overstayCharge.toFixed(2)} deducted from wallet.`
          : `Bay ${cleanSlotCode} released successfully. Session concluded.`,
        receipt: receiptData,
        overstayCharge,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Checkout transaction error:', err.message);
      return res.status(500).json({ error: 'Checkout failed: ' + err.message });
    } finally {
      client.release();
    }
  }

  // Fallback to memory
  const loc = locations.find(l => l.id === locationId);
  const slot = loc?.slots.find(s => s.id === cleanSlotCode);
  if (slot) {
    slot.status = 'available';
    slot.vehicle = null;
  }
  const bk = bookings.find(b => (b.bookingId === bookingId) || (b.locationId === locationId && b.slotId === cleanSlotCode && b.status === 'active'));
  if (bk) {
    bk.status = 'completed';
    bk.exitTime = Date.now();
  }
  saveLocations();
  saveBookings();

  res.json({
    success: true,
    message: `Bay ${cleanSlotCode} released successfully.`,
  });
});

// Alias for RESTful release by ID
app.post('/api/bookings/:id/release', requireAuth, async (req, res) => {
  req.body.bookingId = req.params.id;
  return app._router.handle({ ...req, url: '/api/bookings/checkout', method: 'POST' }, res);
});

// ============================================================
// MY BOOKINGS API (Driver-specific with ownership isolation)
// ============================================================

app.get('/api/bookings/my-bookings', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userCar = req.user.carNumber;

  if (isDbConnected()) {
    try {
      const sql = `
        SELECT 
          b.booking_id AS "bookingId",
          b.user_id AS "userId",
          b.location_id AS "locationId",
          l.name AS "locationName",
          l.area AS "locationArea",
          s.slot_code AS "slotId",
          s.zone,
          s.slot_type AS "slotType",
          b.plate,
          b.driver_name AS driver,
          b.phone,
          b.vehicle_type AS "vehicleType",
          b.hourly_rate::float AS "hourlyRate",
          l.currency,
          b.booked_duration_hours AS "bookedDurationHours",
          (extract(epoch from b.parked_at) * 1000)::bigint AS "parkedAt",
          (extract(epoch from b.exit_time) * 1000)::bigint AS "exitTime",
          b.status,
          b.payment_status AS "paymentStatus",
          r.receipt_id AS "receiptId",
          r.subtotal::float,
          r.tax::float,
          r.total_amount::float AS "totalAmount",
          r.payment_method AS "paymentMethod",
          r.duration_text AS "durationText"
        FROM bookings b
        JOIN locations l ON b.location_id = l.id
        LEFT JOIN parking_slots s ON b.slot_id = s.id
        LEFT JOIN receipts r ON b.booking_id = r.booking_id
        WHERE b.user_id = $1 OR b.plate = $2
        ORDER BY b.parked_at DESC;
      `;

      const result = await query(sql, [userId, userCar]);
      const userBookings = result.rows.map(row => {
        const item = {
          ...row,
          parkedAt: row.parkedAt ? Number(row.parkedAt) : Date.now(),
          exitTime: row.exitTime ? Number(row.exitTime) : null,
        };
        if (row.receiptId) {
          item.receipt = {
            receiptId: row.receiptId,
            subtotal: parseFloat(row.subtotal),
            tax: parseFloat(row.tax),
            totalAmount: parseFloat(row.totalAmount),
            paymentMethod: row.paymentMethod,
            durationText: row.durationText,
          };
        }
        return item;
      });

      return res.json(userBookings);
    } catch (err) {
      console.error('[PostgreSQL] /api/bookings/my-bookings error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  // Fallback to memory
  const userBookings = bookings.filter(b => b.userId === userId || b.plate === userCar);
  res.json(userBookings);
});

// Alias for /api/bookings/my
app.get('/api/bookings/my', requireAuth, (req, res) => {
  return app._router.handle({ ...req, url: '/api/bookings/my-bookings' }, res);
});

// ============================================================
// VEHICLE OWNERS & CAR REGISTRATION API (PostgreSQL CRUD)
// ============================================================

app.get('/api/vehicle-owners', async (req, res) => {
  const { search, type } = req.query;

  if (isDbConnected()) {
    try {
      let sql = 'SELECT * FROM vehicle_owners';
      const conditions = [];
      const params = [];

      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(LOWER(owner_name) LIKE $${params.length} OR LOWER(car_number) LIKE $${params.length} OR phone LIKE $${params.length} OR LOWER(vehicle_make) LIKE $${params.length} OR LOWER(vehicle_model) LIKE $${params.length} OR LOWER(city_area) LIKE $${params.length})`);
      }

      if (type && type !== 'all') {
        params.push(type.toLowerCase());
        conditions.push(`LOWER(vehicle_type) = $${params.length}`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY created_at DESC;';

      const result = await query(sql, params);
      return res.json(result.rows);
    } catch (err) {
      console.error('[PostgreSQL] /api/vehicle-owners error:', err.message);
    }
  }

  // Fallback to memory
  let filtered = [...vehicleOwners];
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(o =>
      (o.owner_name && o.owner_name.toLowerCase().includes(q)) ||
      (o.car_number && o.car_number.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q))
    );
  }
  if (type && type !== 'all') {
    filtered = filtered.filter(o => o.vehicle_type?.toLowerCase() === type.toLowerCase());
  }

  res.json(filtered);
});

app.get('/api/vehicle-owners/:id', async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    try {
      const result = await query(
        'SELECT * FROM vehicle_owners WHERE id = $1 OR car_number = UPPER($1) LIMIT 1',
        [id]
      );
      if (result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
      return res.status(404).json({ error: 'Vehicle owner not found' });
    } catch (err) {
      console.error('[PostgreSQL] /api/vehicle-owners/:id error:', err.message);
    }
  }

  const found = vehicleOwners.find(o => o.id === id || o.car_number?.toUpperCase() === id.toUpperCase());
  if (found) return res.json(found);
  res.status(404).json({ error: 'Vehicle owner not found' });
});

app.post('/api/vehicle-owners', async (req, res) => {
  const {
    ownerName,
    phone,
    email,
    carNumber,
    vehicleMake,
    vehicleModel,
    vehicleType = 'sedan',
    color = 'Pearl White',
    fuelType = 'Petrol',
    fastagId,
    passType = 'Daily Pass',
    cityArea = 'Ahmedabad',
    emergencyPhone,
  } = req.body;

  if (!phone || !carNumber || !ownerName) {
    return res.status(400).json({ error: 'Owner Name, Phone Number, and Car / Vehicle Registration Plate are required.' });
  }

  const cleanName = ownerName.trim();
  const cleanPhone = phone.trim().replace(/\D/g, '');
  const cleanCar = carNumber.trim().toUpperCase().replace(/\s+/g, '-');
  const cleanEmail = email ? email.trim() : null;
  const cleanMake = vehicleMake ? vehicleMake.trim() : 'Standard';
  const cleanModel = vehicleModel ? vehicleModel.trim() : 'Model';
  const cleanType = vehicleType || 'sedan';
  const cleanColor = color || 'White';
  const cleanFuel = fuelType || 'Petrol';
  const cleanFastag = fastagId ? fastagId.trim() : `FASTAG-IND-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const cleanPass = passType || 'Daily Pass';
  const cleanArea = cityArea ? cityArea.trim() : 'Ahmedabad';
  const cleanEmergency = emergencyPhone ? emergencyPhone.trim() : null;

  const id = `own_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

  if (isDbConnected()) {
    try {
      const ownerRes = await query(`
        INSERT INTO vehicle_owners (
          id, owner_name, phone, email, car_number, vehicle_make, vehicle_model,
          vehicle_type, color, fuel_type, fastag_id, pass_type, city_area,
          emergency_phone, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (car_number) DO UPDATE SET
          owner_name = EXCLUDED.owner_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          vehicle_make = EXCLUDED.vehicle_make,
          vehicle_model = EXCLUDED.vehicle_model,
          vehicle_type = EXCLUDED.vehicle_type,
          color = EXCLUDED.color,
          fuel_type = EXCLUDED.fuel_type,
          fastag_id = EXCLUDED.fastag_id,
          pass_type = EXCLUDED.pass_type,
          city_area = EXCLUDED.city_area,
          emergency_phone = EXCLUDED.emergency_phone,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `, [
        id, cleanName, cleanPhone, cleanEmail, cleanCar, cleanMake, cleanModel,
        cleanType, cleanColor, cleanFuel, cleanFastag, cleanPass, cleanArea, cleanEmergency
      ]);

      const savedOwner = ownerRes.rows[0];

      // Keep users table synchronized
      const userId = `usr_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      await query(`
        INSERT INTO users (id, name, phone, car_number, vehicle_type, created_at, last_login)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (phone) DO UPDATE SET
          name = EXCLUDED.name,
          car_number = EXCLUDED.car_number,
          vehicle_type = EXCLUDED.vehicle_type,
          last_login = CURRENT_TIMESTAMP;
      `, [userId, cleanName, cleanPhone, cleanCar, cleanType]);

      return res.status(201).json({
        success: true,
        message: `Vehicle ${cleanCar} & Owner ${cleanName} saved to PostgreSQL (public.vehicle_owners)!`,
        owner: savedOwner,
        database: 'PostgreSQL 16 (Live)'
      });
    } catch (err) {
      console.error('[PostgreSQL] /api/vehicle-owners POST error:', err.message);
      return res.status(500).json({ error: 'Failed to register vehicle owner' });
    }
  }

  // Memory fallback
  const newOwner = {
    id,
    owner_name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    car_number: cleanCar,
    vehicle_make: cleanMake,
    vehicle_model: cleanModel,
    vehicle_type: cleanType,
    color: cleanColor,
    fuel_type: cleanFuel,
    fastag_id: cleanFastag,
    pass_type: cleanPass,
    city_area: cleanArea,
    emergency_phone: cleanEmergency,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  vehicleOwners.unshift(newOwner);
  saveVehicleOwners();

  res.status(201).json({
    success: true,
    message: `Vehicle ${cleanCar} & Owner ${cleanName} saved successfully!`,
    owner: newOwner,
    database: 'Memory Cache / JSON Dataset'
  });
});

app.put('/api/vehicle-owners/:id', async (req, res) => {
  const { id } = req.params;
  const {
    ownerName,
    phone,
    email,
    carNumber,
    vehicleMake,
    vehicleModel,
    vehicleType,
    color,
    fuelType,
    fastagId,
    passType,
    cityArea,
    emergencyPhone,
  } = req.body;

  if (isDbConnected()) {
    try {
      const updateRes = await query(`
        UPDATE vehicle_owners
        SET 
          owner_name = COALESCE($1, owner_name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          car_number = COALESCE($4, car_number),
          vehicle_make = COALESCE($5, vehicle_make),
          vehicle_model = COALESCE($6, vehicle_model),
          vehicle_type = COALESCE($7, vehicle_type),
          color = COALESCE($8, color),
          fuel_type = COALESCE($9, fuel_type),
          fastag_id = COALESCE($10, fastag_id),
          pass_type = COALESCE($11, pass_type),
          city_area = COALESCE($12, city_area),
          emergency_phone = COALESCE($13, emergency_phone),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $14 OR car_number = $4
        RETURNING *;
      `, [
        ownerName ? ownerName.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        carNumber ? carNumber.trim().toUpperCase() : null,
        vehicleMake ? vehicleMake.trim() : null,
        vehicleModel ? vehicleModel.trim() : null,
        vehicleType || null,
        color || null,
        fuelType || null,
        fastagId || null,
        passType || null,
        cityArea || null,
        emergencyPhone || null,
        id
      ]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle owner not found for update' });
      }

      return res.json({
        success: true,
        message: 'Vehicle owner details updated in PostgreSQL',
        owner: updateRes.rows[0]
      });
    } catch (err) {
      console.error('[PostgreSQL] /api/vehicle-owners PUT error:', err.message);
      return res.status(500).json({ error: 'Update failed' });
    }
  }

  // Memory fallback
  const idx = vehicleOwners.findIndex(o => o.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Vehicle owner not found' });
  vehicleOwners[idx] = { ...vehicleOwners[idx], ...req.body, updated_at: new Date().toISOString() };
  saveVehicleOwners();
  res.json({ success: true, owner: vehicleOwners[idx] });
});

app.delete('/api/vehicle-owners/:id', async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    try {
      const delRes = await query('DELETE FROM vehicle_owners WHERE id = $1 RETURNING car_number;', [id]);
      if (delRes.rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle owner not found' });
      }
      return res.json({ success: true, message: `Vehicle owner ${delRes.rows[0].car_number} deleted from PostgreSQL.` });
    } catch (err) {
      console.error('[PostgreSQL] /api/vehicle-owners DELETE error:', err.message);
      return res.status(500).json({ error: 'Delete failed' });
    }
  }

  vehicleOwners = vehicleOwners.filter(o => o.id !== id);
  saveVehicleOwners();
  res.json({ success: true, message: 'Vehicle owner deleted' });
});

// Today's collected parking revenue (sum of receipts paid today, India time)
app.get('/api/stats/revenue-today', async (req, res) => {
  if (!isDbConnected()) return res.json({ totalRevenue: 0 });
  try {
    const result = await query(`
      SELECT COALESCE(SUM(r.total_amount - COALESCE(b.refund_amount, 0)), 0) AS total
      FROM receipts r
      LEFT JOIN bookings b ON b.booking_id = r.booking_id
      WHERE (r.paid_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
    `);
    res.json({ totalRevenue: parseFloat(result.rows[0].total) });
  } catch (err) {
    console.error('[PostgreSQL] revenue-today error:', err.message);
    res.status(500).json({ error: 'Failed to load revenue' });
  }
});

// Telemetry Dataset Summary
app.get('/api/dataset/summary', (req, res) => {
  const records = parseCSVDataset();
  if (records.length === 0) {
    return res.json({ available: false });
  }

  const totalRecords = records.length;
  const occupiedCount = records.filter(r => r.Occupancy_Status === 'Occupied').length;
  const evCount = records.filter(r => r.Electric_Vehicle === '1' || r.Vehicle_Type === 'Electric Vehicle').length;
  const motorcycleCount = records.filter(r => r.Vehicle_Type === 'Motorcycle').length;
  const avgTemp = (records.reduce((acc, r) => acc + (parseFloat(r.Weather_Temperature) || 0), 0) / totalRecords).toFixed(1);
  const avgDuration = (records.reduce((acc, r) => acc + (parseFloat(r.Parking_Duration) || 0), 0) / totalRecords).toFixed(1);

  res.json({
    available: true,
    totalSessions: totalRecords,
    occupancyRatePct: Math.round((occupiedCount / totalRecords) * 100),
    evCount,
    motorcycleCount,
    avgTemperatureC: avgTemp,
    avgDurationHours: avgDuration,
  });
});

// Reset all slots to dataset initial state (Admin operation)
app.post('/api/reset', requireAuth, requireAdmin, async (req, res) => {
  locations = initLocationsFromDataset();
  saveLocations();

  if (isDbConnected()) {
    try {
      await query('TRUNCATE TABLE receipts, bookings, parking_slots CASCADE;');
      for (const loc of locations) {
        for (const s of loc.slots) {
          const slotDbId = `${loc.id}_${s.id}`;
          const isOcc = s.status === 'occupied';
          const v = s.vehicle || {};
          const sn = s.sensor || {};
          await query(`
            INSERT INTO parking_slots (
              id, location_id, slot_code, spot_number, zone, slot_type, status,
              current_plate, current_driver, current_phone, parked_at, battery_level,
              sensor_ultrasonic, sensor_proximity, sensor_pressure, sensor_noise,
              sensor_temperature, nearby_traffic, dynamic_pricing_factor, spot_size
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);
          `, [
            slotDbId, loc.id, s.id, s.spotNumber || 1, s.zone || 'A', s.type || 'compact', s.status || 'available',
            isOcc ? v.plate : null, isOcc ? v.driver : null, isOcc ? v.phone : null,
            isOcc && v.parkedAt ? new Date(v.parkedAt) : null, isOcc ? v.batteryLevel : null,
            sn.ultrasonic || 100, sn.proximity || 2.5, sn.pressure || 3.0, sn.noise || 50,
            sn.temperature || 28, sn.traffic || 'Low', sn.dynamicPricing || 1.0, sn.spotSize || 'Standard'
          ]);
        }
      }
      await applySafeDatabaseEnhancements();
    } catch (err) {
      console.error('[PostgreSQL] Reset error:', err.message);
    }
  }

  res.json({ success: true, message: 'Parking system reset with slots re-seeded from dataset.' });
});

// Boot server and verify PostgreSQL connection
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (isDirectRun && process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`Ahmedabad Smart Parking Backend API running on http://localhost:${PORT}`);
    await ensureDatabaseReady();
  });
}

export default app;
