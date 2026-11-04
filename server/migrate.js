import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initPostgres, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const LOCATIONS_FILE = path.join(DATA_DIR, 'ahmedabad_parking.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

async function runMigration() {
  console.log('--- Starting PostgreSQL Migration & Data Seeding ---');

  const connected = await initPostgres();
  if (!connected) {
    console.error('Migration aborted: PostgreSQL connection could not be established.');
    console.error('Please verify your DATABASE_URL or PG environment variables in .env');
    process.exit(1);
  }

  try {
    // 1. Migrate Locations & Parking Slots
    if (fs.existsSync(LOCATIONS_FILE)) {
      const locations = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf-8'));
      console.log(`Found ${locations.length} locations to seed into PostgreSQL...`);

      for (const loc of locations) {
        // Upsert location
        await query(`
          INSERT INTO locations (id, name, area, address, lat, lng, rating, hourly_rate, currency)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            area = EXCLUDED.area,
            address = EXCLUDED.address,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            rating = EXCLUDED.rating,
            hourly_rate = EXCLUDED.hourly_rate,
            currency = EXCLUDED.currency,
            updated_at = CURRENT_TIMESTAMP
        `, [
          loc.id,
          loc.name,
          loc.area,
          loc.address,
          loc.lat,
          loc.lng,
          loc.rating || 4.5,
          loc.hourlyRate || 30.0,
          loc.currency || '₹'
        ]);

        // Insert / Update Slots
        if (loc.slots && Array.isArray(loc.slots)) {
          for (const s of loc.slots) {
            const slotDbId = `${loc.id}_${s.id}`;
            const isOccupied = s.status === 'occupied';
            const vehicle = s.vehicle || {};
            const sensor = s.sensor || {};

            await query(`
              INSERT INTO parking_slots (
                id, location_id, slot_code, spot_number, zone, slot_type, status,
                current_plate, current_driver, current_phone, parked_at, battery_level,
                sensor_ultrasonic, sensor_proximity, sensor_pressure, sensor_noise,
                sensor_temperature, nearby_traffic, dynamic_pricing_factor, spot_size
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
              ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                current_plate = EXCLUDED.current_plate,
                current_driver = EXCLUDED.current_driver,
                current_phone = EXCLUDED.current_phone,
                parked_at = EXCLUDED.parked_at,
                battery_level = EXCLUDED.battery_level,
                sensor_ultrasonic = EXCLUDED.sensor_ultrasonic,
                sensor_proximity = EXCLUDED.sensor_proximity,
                sensor_pressure = EXCLUDED.sensor_pressure,
                sensor_noise = EXCLUDED.sensor_noise,
                sensor_temperature = EXCLUDED.sensor_temperature,
                nearby_traffic = EXCLUDED.nearby_traffic,
                dynamic_pricing_factor = EXCLUDED.dynamic_pricing_factor,
                spot_size = EXCLUDED.spot_size,
                updated_at = CURRENT_TIMESTAMP
            `, [
              slotDbId,
              loc.id,
              s.id,
              s.spotNumber || 1,
              s.zone || 'A',
              s.type || 'compact',
              s.status || 'available',
              isOccupied ? vehicle.plate : null,
              isOccupied ? vehicle.driver : null,
              isOccupied ? vehicle.phone : null,
              isOccupied && vehicle.parkedAt ? new Date(vehicle.parkedAt) : null,
              isOccupied ? (vehicle.batteryLevel || null) : null,
              sensor.ultrasonic || 100.0,
              sensor.proximity || 2.5,
              sensor.pressure || 3.0,
              sensor.noise || 50.0,
              sensor.temperature || 28.0,
              sensor.traffic || 'Low',
              sensor.dynamicPricing || 1.0,
              sensor.spotSize || 'Standard'
            ]);
          }
        }
      }
      console.log(`[PostgreSQL] Locations and parking slot bays successfully migrated.`);
    }

    // 2. Migrate Users
    if (fs.existsSync(USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      for (const u of users) {
        await query(`
          INSERT INTO users (id, name, phone, car_number, vehicle_type, created_at, last_login)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            car_number = EXCLUDED.car_number,
            vehicle_type = EXCLUDED.vehicle_type,
            last_login = EXCLUDED.last_login
        `, [
          u.id,
          u.name,
          u.phone,
          u.carNumber,
          u.vehicleType || 'compact',
          u.createdAt ? new Date(u.createdAt) : new Date(),
          u.lastLogin ? new Date(u.lastLogin) : new Date(),
        ]);
      }
      console.log(`[PostgreSQL] Migrated ${users.length} users.`);
    }

    // 2b. Migrate Vehicle Owners & Cars
    const OWNERS_FILE = path.join(DATA_DIR, 'vehicle_owners.json');
    if (fs.existsSync(OWNERS_FILE)) {
      const owners = JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf-8'));
      for (const o of owners) {
        await query(`
          INSERT INTO vehicle_owners (
            id, owner_name, phone, email, car_number, vehicle_make, vehicle_model,
            vehicle_type, color, fuel_type, fastag_id, pass_type, city_area,
            emergency_phone, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
            updated_at = CURRENT_TIMESTAMP;
        `, [
          o.id,
          o.owner_name,
          o.phone,
          o.email || null,
          o.car_number,
          o.vehicle_make || null,
          o.vehicle_model || null,
          o.vehicle_type || 'sedan',
          o.color || null,
          o.fuel_type || 'Petrol',
          o.fastag_id || null,
          o.pass_type || 'Daily Pass',
          o.city_area || 'Ahmedabad',
          o.emergency_phone || null,
          o.created_at ? new Date(o.created_at) : new Date(),
          o.updated_at ? new Date(o.updated_at) : new Date(),
        ]);
      }
      console.log(`[PostgreSQL] Migrated ${owners.length} vehicle owners & cars.`);
    }

    // 3. Migrate Bookings & Receipts
    if (fs.existsSync(BOOKINGS_FILE)) {
      const bookings = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
      for (const b of bookings) {
        const slotDbId = `${b.locationId}_${b.slotId}`;
        await query(`
          INSERT INTO bookings (
            booking_id, location_id, slot_id, plate, driver_name, phone, vehicle_type,
            hourly_rate, booked_duration_hours, status, parked_at, exit_time
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (booking_id) DO NOTHING
        `, [
          b.booking_id || b.bookingId,
          b.locationId,
          slotDbId,
          b.plate,
          b.driver || b.driverName || 'Guest',
          b.phone || 'N/A',
          b.vehicleType || 'compact',
          b.hourlyRate || 30.0,
          b.bookedDurationHours || 2,
          b.status || 'active',
          b.parkedAt ? new Date(b.parkedAt) : new Date(),
          b.exitTime ? new Date(b.exitTime) : null
        ]);

        if (b.receipt) {
          const r = b.receipt;
          await query(`
            INSERT INTO receipts (
              receipt_id, booking_id, subtotal, tax, total_amount,
              payment_method, payment_status, duration_text, billed_hours, paid_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (receipt_id) DO NOTHING
          `, [
            r.receiptId,
            b.booking_id || b.bookingId,
            r.subtotal || 30.0,
            r.tax || 1.5,
            r.totalAmount || 31.5,
            r.paymentMethod || 'UPI',
            'PAID',
            r.durationText || '1 hr',
            1,
            new Date()
          ]);
        }
      }
      console.log(`[PostgreSQL] Migrated ${bookings.length} bookings and receipts.`);
    }

    console.log('--- Migration completed successfully! ---');
  } catch (err) {
    console.error('Migration failed with error:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
