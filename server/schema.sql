-- ============================================================
-- AHMEDABAD SMART PARKING MANAGEMENT SYSTEM
-- PostgreSQL Database Initialization Schema (7 Relational Tables)
-- ============================================================

-- 1. LOCATIONS TABLE (11 Columns)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    area VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(10, 6) NOT NULL,
    lng NUMERIC(10, 6) NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 4.5,
    hourly_rate NUMERIC(8, 2) NOT NULL DEFAULT 30.00,
    currency VARCHAR(10) DEFAULT '₹',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (with Smart Mobility Wallet, Role & Google OAuth)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150),
    google_id VARCHAR(100),
    avatar_url TEXT,
    car_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'compact',
    wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    role VARCHAR(20) DEFAULT 'driver',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. VEHICLE OWNERS & CAR REGISTRATION TABLE
CREATE TABLE IF NOT EXISTS vehicle_owners (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    owner_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    car_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    vehicle_type VARCHAR(20) DEFAULT 'sedan',
    color VARCHAR(30),
    fuel_type VARCHAR(20) DEFAULT 'Petrol',
    fastag_id VARCHAR(50),
    pass_type VARCHAR(30) DEFAULT 'Daily Pass',
    city_area VARCHAR(100) DEFAULT 'Ahmedabad',
    emergency_phone VARCHAR(20),
    verification_status VARCHAR(50) DEFAULT 'pending_official_verification',
    is_default BOOLEAN DEFAULT FALSE,
    wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. PARKING SLOTS TABLE (21 Columns)
CREATE TABLE IF NOT EXISTS parking_slots (
    id VARCHAR(50) PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    slot_code VARCHAR(20) NOT NULL,
    spot_number INTEGER NOT NULL,
    zone VARCHAR(5) NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'compact',
    status VARCHAR(20) DEFAULT 'available',
    current_plate VARCHAR(30),
    current_driver VARCHAR(100),
    current_phone VARCHAR(20),
    parked_at TIMESTAMPTZ,
    battery_level INTEGER,
    sensor_ultrasonic NUMERIC(6, 2) DEFAULT 100.0,
    sensor_proximity NUMERIC(6, 2) DEFAULT 2.5,
    sensor_pressure NUMERIC(6, 2) DEFAULT 3.0,
    sensor_noise NUMERIC(6, 2) DEFAULT 50.0,
    sensor_temperature NUMERIC(5, 2) DEFAULT 28.0,
    nearby_traffic VARCHAR(20) DEFAULT 'Low',
    dynamic_pricing_factor NUMERIC(4, 2) DEFAULT 1.0,
    spot_size VARCHAR(30) DEFAULT 'Standard',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. BOOKINGS TABLE (18 Columns: with Physical Arrival Verification & Pre-pay Status)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    location_id VARCHAR(50) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    slot_id VARCHAR(50) NOT NULL REFERENCES parking_slots(id) ON DELETE RESTRICT,
    plate VARCHAR(30) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'compact',
    hourly_rate NUMERIC(8, 2) NOT NULL,
    booked_duration_hours INTEGER DEFAULT 2,
    status VARCHAR(20) DEFAULT 'active',
    checkin_verified BOOLEAN DEFAULT FALSE,
    checkin_method VARCHAR(100) DEFAULT 'FASTag RFID',
    checkin_time TIMESTAMPTZ,
    payment_status VARCHAR(50) DEFAULT 'PAID_WALLET',
    parked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. RECEIPTS TABLE (10 Columns)
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'SMART_WALLET',
    payment_status VARCHAR(20) DEFAULT 'PAID',
    duration_text VARCHAR(100) NOT NULL,
    billed_hours INTEGER NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. WALLET TRANSACTIONS TABLE (9 Columns: ACID Audit Trail)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    car_number VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'CREDIT' or 'DEBIT'
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    reference_id VARCHAR(50),
    balance_after NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. LOGIN HISTORY TABLE (every sign-in is kept; rows are never updated or deleted)
CREATE TABLE IF NOT EXISTS login_history (
    id VARCHAR(60) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    car_number VARCHAR(30),
    vehicle_type VARCHAR(20),
    login_method VARCHAR(20) DEFAULT 'mobile',
    logged_in_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(logged_in_at);

-- AUTO-MIGRATE COLUMNS IF ALREADY CREATED PREVIOUSLY
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 500.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'driver';
ALTER TABLE vehicle_owners ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 500.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_method VARCHAR(100) DEFAULT 'FASTag RFID';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_time TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PAID_WALLET';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

-- PERFORMANCE & INTEGRITY INDEXES
CREATE INDEX IF NOT EXISTS idx_slots_location ON parking_slots(location_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_plate ON bookings(plate);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(location_id, slot_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot_booking ON bookings (slot_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_owners_car_number ON vehicle_owners(car_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_owners_phone ON vehicle_owners(phone);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_car ON wallet_transactions(car_number);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref ON wallet_transactions(reference_id);
