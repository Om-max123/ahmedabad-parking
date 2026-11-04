// ============================================================
// AHMEDABAD SMART PARKING MANAGEMENT SYSTEM
// Prisma Seeding & Data Population Script
// Populates all 5 tables from the Ahmedabad IoT Dataset
// ============================================================

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const prisma = new PrismaClient();

const DATA_DIR = path.join(projectRoot, 'server', 'data');
const LOCATIONS_FILE = path.join(DATA_DIR, 'ahmedabad_parking.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

export async function seedAllTables() {
  console.log('====================================================');
  console.log('🚀 Starting Prisma PostgreSQL Database Population...');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // 1. Seed LOCATIONS & PARKING SLOTS
    // ----------------------------------------------------
    if (fs.existsSync(LOCATIONS_FILE)) {
      const locationsData = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf-8'));
      console.log(`📍 Found ${locationsData.length} locations to populate...`);

      let totalSlotsSeeded = 0;

      for (const loc of locationsData) {
        // Upsert Location
        await prisma.location.upsert({
          where: { id: loc.id },
          update: {
            name: loc.name,
            area: loc.area,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            rating: loc.rating || 4.5,
            hourlyRate: loc.hourlyRate || 30.0,
            currency: loc.currency || '₹',
          },
          create: {
            id: loc.id,
            name: loc.name,
            area: loc.area,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            rating: loc.rating || 4.5,
            hourlyRate: loc.hourlyRate || 30.0,
            currency: loc.currency || '₹',
          },
        });

        // Upsert Parking Slots
        if (loc.slots && Array.isArray(loc.slots)) {
          for (const s of loc.slots) {
            const slotDbId = `${loc.id}_${s.id}`;
            const isOcc = s.status === 'occupied';
            const v = s.vehicle || {};
            const sn = s.sensor || {};

            await prisma.parkingSlot.upsert({
              where: { id: slotDbId },
              update: {
                locationId: loc.id,
                slotCode: s.id,
                spotNumber: s.spotNumber || 1,
                zone: s.zone || 'A',
                slotType: s.type || 'compact',
                status: s.status || 'available',
                currentPlate: isOcc ? v.plate : null,
                currentDriver: isOcc ? v.driver : null,
                currentPhone: isOcc ? v.phone : null,
                parkedAt: isOcc && v.parkedAt ? new Date(v.parkedAt) : null,
                batteryLevel: isOcc ? (v.batteryLevel || null) : null,
                sensorUltrasonic: sn.ultrasonic || 100.0,
                sensorProximity: sn.proximity || 2.5,
                sensorPressure: sn.pressure || 3.0,
                sensorNoise: sn.noise || 50.0,
                sensorTemperature: sn.temperature || 28.0,
                nearbyTraffic: sn.traffic || 'Low',
                dynamicPricingFactor: sn.dynamicPricing || 1.0,
                spotSize: sn.spotSize || 'Standard',
              },
              create: {
                id: slotDbId,
                locationId: loc.id,
                slotCode: s.id,
                spotNumber: s.spotNumber || 1,
                zone: s.zone || 'A',
                slotType: s.type || 'compact',
                status: s.status || 'available',
                currentPlate: isOcc ? v.plate : null,
                currentDriver: isOcc ? v.driver : null,
                currentPhone: isOcc ? v.phone : null,
                parkedAt: isOcc && v.parkedAt ? new Date(v.parkedAt) : null,
                batteryLevel: isOcc ? (v.batteryLevel || null) : null,
                sensorUltrasonic: sn.ultrasonic || 100.0,
                sensorProximity: sn.proximity || 2.5,
                sensorPressure: sn.pressure || 3.0,
                sensorNoise: sn.noise || 50.0,
                sensorTemperature: sn.temperature || 28.0,
                nearbyTraffic: sn.traffic || 'Low',
                dynamicPricingFactor: sn.dynamicPricing || 1.0,
                spotSize: sn.spotSize || 'Standard',
              },
            });
            totalSlotsSeeded++;
          }
        }
      }

      console.log(`✅ [locations] Populated ${locationsData.length} records.`);
      console.log(`✅ [parking_slots] Populated ${totalSlotsSeeded} bays with live sensor readings.`);
    }

    // ----------------------------------------------------
    // 2. Seed USERS
    // ----------------------------------------------------
    if (fs.existsSync(USERS_FILE)) {
      const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      console.log(`\n👤 Seeding ${usersData.length} registered users...`);

      for (const u of usersData) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {
            name: u.name,
            phone: u.phone,
            carNumber: u.carNumber,
            vehicleType: u.vehicleType || 'compact',
            lastLogin: u.lastLogin ? new Date(u.lastLogin) : new Date(),
          },
          create: {
            id: u.id,
            name: u.name,
            phone: u.phone,
            carNumber: u.carNumber,
            vehicleType: u.vehicleType || 'compact',
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
            lastLogin: u.lastLogin ? new Date(u.lastLogin) : new Date(),
          },
        });
      }

      console.log(`✅ [users] Populated ${usersData.length} users.`);
    }

    // ----------------------------------------------------
    // 3. Seed BOOKINGS & RECEIPTS
    // ----------------------------------------------------
    if (fs.existsSync(BOOKINGS_FILE)) {
      const bookingsData = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
      console.log(`\n📋 Seeding ${bookingsData.length} parking sessions & invoices...`);

      let receiptsCount = 0;

      for (const b of bookingsData) {
        const bookingId = b.booking_id || b.bookingId;
        const slotDbId = `${b.locationId}_${b.slotId}`;

        // Ensure slot exists or use fallback
        const slotExists = await prisma.parkingSlot.findUnique({ where: { id: slotDbId } });
        if (!slotExists) {
          console.warn(`Skipping booking ${bookingId}: Slot ${slotDbId} not found.`);
          continue;
        }

        // Match user by carNumber
        const matchedUser = await prisma.user.findFirst({ where: { carNumber: b.plate } });

        await prisma.booking.upsert({
          where: { bookingId },
          update: {
            userId: matchedUser ? matchedUser.id : null,
            locationId: b.locationId,
            slotId: slotDbId,
            plate: b.plate,
            driverName: b.driver || b.driverName || 'Guest',
            phone: b.phone || '9800000000',
            vehicleType: b.vehicleType || 'compact',
            hourlyRate: b.hourlyRate || 30.0,
            bookedDurationHours: b.bookedDurationHours || 2,
            status: b.status || 'active',
            parkedAt: b.parkedAt ? new Date(b.parkedAt) : new Date(),
            exitTime: b.exitTime ? new Date(b.exitTime) : null,
          },
          create: {
            bookingId,
            userId: matchedUser ? matchedUser.id : null,
            locationId: b.locationId,
            slotId: slotDbId,
            plate: b.plate,
            driverName: b.driver || b.driverName || 'Guest',
            phone: b.phone || '9800000000',
            vehicleType: b.vehicleType || 'compact',
            hourlyRate: b.hourlyRate || 30.0,
            bookedDurationHours: b.bookedDurationHours || 2,
            status: b.status || 'active',
            parkedAt: b.parkedAt ? new Date(b.parkedAt) : new Date(),
            exitTime: b.exitTime ? new Date(b.exitTime) : null,
          },
        });

        // Insert Receipt if present
        if (b.receipt) {
          const r = b.receipt;
          await prisma.receipt.upsert({
            where: { receiptId: r.receiptId },
            update: {
              bookingId,
              subtotal: r.subtotal || 30.0,
              tax: r.tax || 1.5,
              totalAmount: r.totalAmount || 31.5,
              paymentMethod: r.paymentMethod || 'UPI',
              paymentStatus: 'PAID',
              durationText: r.durationText || '1 hr',
              billedHours: 1,
            },
            create: {
              receiptId: r.receiptId,
              bookingId,
              subtotal: r.subtotal || 30.0,
              tax: r.tax || 1.5,
              totalAmount: r.totalAmount || 31.5,
              paymentMethod: r.paymentMethod || 'UPI',
              paymentStatus: 'PAID',
              durationText: r.durationText || '1 hr',
              billedHours: 1,
              paidAt: new Date(),
            },
          });
          receiptsCount++;
        }
      }

      console.log(`✅ [bookings] Populated ${bookingsData.length} booking sessions.`);
      console.log(`✅ [receipts] Populated ${receiptsCount} fiscal invoice receipts.`);
    }

    // Print final summary
    const [locCount, slotCount, userCount, bookCount, recCount] = await Promise.all([
      prisma.location.count(),
      prisma.parkingSlot.count(),
      prisma.user.count(),
      prisma.booking.count(),
      prisma.receipt.count(),
    ]);

    console.log('\n====================================================');
    console.log('🎉 PostgreSQL Database Status (Prisma Verified):');
    console.log(` • locations:     ${locCount} rows`);
    console.log(` • parking_slots: ${slotCount} rows`);
    console.log(` • users:         ${userCount} rows`);
    console.log(` • bookings:      ${bookCount} rows`);
    console.log(` • receipts:      ${recCount} rows`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Error during Prisma data push/seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run if executed directly via `node prisma/seed.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAllTables()
    .then(() => {
      console.log('✨ Data population completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Execution halted:', err.message);
      process.exit(1);
    });
}
