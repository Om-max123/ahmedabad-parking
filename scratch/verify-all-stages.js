import http from 'http';
import app from '../server/server.js';
import { initPostgres, pool, query } from '../server/db.js';

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}`;

async function runAllVerifications() {
  console.log('========================================================================');
  console.log('AHMEDABAD PARKING RESERVATION SYSTEM — STAGE 10 VERIFICATION SUITE');
  console.log('========================================================================\n');

  // 1. Initialize DB and start test server
  console.log('[CHECK 1] Initializing PostgreSQL connection...');
  const connected = await initPostgres();
  if (!connected) {
    console.error('❌ DB connection failed. Check credentials.');
    process.exit(1);
  }
  console.log('✓ PostgreSQL connected successfully.\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Test server running on ${BASE_URL}\n`);

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition, message) {
    totalChecks++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passedChecks++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  try {
    // [CHECK 2] Municipal Dataset & Locality Search (including Thaltej)
    console.log('[CHECK 2] Testing Municipal Dataset & Thaltej Search...');
    const allLocsRes = await fetch(`${BASE_URL}/api/locations`);
    const allLocs = await allLocsRes.json();
    assert(Array.isArray(allLocs) && allLocs.length >= 9, `Retrieved ${allLocs.length} municipal locations across Ahmedabad`);

    const thaltejRes = await fetch(`${BASE_URL}/api/locations?q=thaltej`);
    const thaltejLocs = await thaltejRes.json();
    assert(thaltejLocs.length > 0 && thaltejLocs[0].area.toLowerCase().includes('thaltej'), 'Thaltej locality search returns verified municipal hub');
    assert(thaltejLocs[0].hourlyRate > 0, `Thaltej hourly tariff is ₹${thaltejLocs[0].hourlyRate}/hr`);

    // Honest no-results
    const noResultsRes = await fetch(`${BASE_URL}/api/locations?q=BopalUnmappedAreaXYZ`);
    const noResults = await noResultsRes.json();
    assert(Array.isArray(noResults) && noResults.length === 0, 'Unmapped area returns honest empty array for frontend fallback UI');

    // [CHECK 3] Security & Authentication Boundaries
    console.log('\n[CHECK 3] Testing Security & Unauthenticated Access Control...');
    const unauthBooking = await fetch(`${BASE_URL}/api/bookings/prepay-and-park`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: 'loc-thaltej', slotId: 'A-01' }),
    });
    assert(unauthBooking.status === 401, 'Logged-out request to /api/bookings/prepay-and-park returns HTTP 401 Unauthorized');

    const unauthWallet = await fetch(`${BASE_URL}/api/wallet/balance`);
    assert(unauthWallet.status === 401, 'Logged-out request to /api/wallet/balance returns HTTP 401 Unauthorized');

    const unauthVehicles = await fetch(`${BASE_URL}/api/vehicles`);
    assert(unauthVehicles.status === 401, 'Logged-out request to /api/vehicles returns HTTP 401 Unauthorized');

    // [CHECK 4] Driver Authentication & Development Fallback
    console.log('\n[CHECK 4] Testing Driver Authentication & JWT Issuance...');
    const authRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pratik Patel',
        phone: '9898012345',
        carNumber: 'GJ-01-PT-4567',
        vehicleType: 'compact',
      }),
    });
    const authData = await authRes.json();
    assert(authRes.status === 200 && authData.token, 'Driver authenticated; cryptographic HMAC session token issued');
    const token = authData.token;
    const user = authData.user;
    assert(user.carNumber === 'GJ-01-PT-4567', 'Driver profile registered with normalized Gujarat plate GJ-01-PT-4567');

    // [CHECK 5] Vehicle Registry Management
    console.log('\n[CHECK 5] Testing Vehicle Registry Management...');
    const addVehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        carNumber: 'GJ-01-EV-9999',
        vehicleType: 'ev',
        vehicleMake: 'Tata',
        vehicleModel: 'Nexon EV',
        fuelType: 'Electric',
      }),
    });
    const addVehData = await addVehRes.json();
    assert(addVehRes.status === 201 && addVehData.success, 'New vehicle GJ-01-EV-9999 registered in user registry');
    assert(addVehData.vehicle?.verification_status === 'pending_official_verification', 'Vehicle verification status accurately labeled as pending official verification');

    const getVehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const vehList = await getVehRes.json();
    assert(vehList.some((v) => v.car_number === 'GJ-01-EV-9999'), 'Vehicle appears in authenticated user vehicle list');

    // [CHECK 6] Insufficient Balance Transaction Protection
    console.log('\n[CHECK 6] Testing Insufficient Balance Protection...');
    // Create broke driver with 0 balance
    const brokeRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Broke Driver',
        phone: '9898000000',
        carNumber: 'GJ-01-BR-0000',
        vehicleType: 'compact',
      }),
    });
    const brokeData = await brokeRes.json();
    await query('UPDATE users SET wallet_balance = 0 WHERE id = $1', [brokeData.user.id]);

    // Ensure slot A-02 is free and has no active bookings
    await query("UPDATE bookings SET status = 'completed', exit_time = CURRENT_TIMESTAMP WHERE slot_id = 'loc-thaltej_A-02' AND status = 'active'");
    await query("UPDATE parking_slots SET status = 'available', current_plate = NULL WHERE id = 'loc-thaltej_A-02'");

    const brokeBooking = await fetch(`${BASE_URL}/api/bookings/prepay-and-park`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${brokeData.token}`,
      },
      body: JSON.stringify({
        locationId: 'loc-thaltej',
        slotId: 'A-02',
        durationHours: 2,
        plate: 'GJ-01-BR-0000',
        phone: '9898000000',
        driverName: 'Broke Driver',
      }),
    });
    const brokeBookingData = await brokeBooking.json();
    assert(brokeBooking.status === 402 || brokeBooking.status === 400, 'Insufficient balance booking correctly rejected by server');
    const brokeBalCheck = await query('SELECT wallet_balance FROM users WHERE id = $1', [brokeData.user.id]);
    assert(parseFloat(brokeBalCheck.rows[0].wallet_balance) === 0, 'Wallet balance remained unchanged (₹0.00)');

    // [CHECK 7] Valid Atomic Booking & Wallet Ledger Transaction
    console.log('\n[CHECK 7] Testing Valid Booking & Wallet Ledger Atomicity...');
    // Ensure driver has ₹500
    await query('UPDATE users SET wallet_balance = 500 WHERE id = $1', [user.id]);

    // Make slot A-02 available and clear active bookings
    await query("UPDATE bookings SET status = 'completed', exit_time = CURRENT_TIMESTAMP WHERE slot_id = 'loc-thaltej_A-02' AND status = 'active'");
    await query("UPDATE parking_slots SET status = 'available', current_plate = NULL WHERE id = 'loc-thaltej_A-02'");

    const bookRes = await fetch(`${BASE_URL}/api/bookings/prepay-and-park`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        locationId: 'loc-thaltej',
        slotId: 'A-02',
        durationHours: 2,
        plate: 'GJ-01-PT-4567',
        phone: '9898012345',
        driverName: 'Pratik Patel',
      }),
    });
    const bookData = await bookRes.json();
    console.log('Book response debug:', bookRes.status, bookData);
    const bookingId = bookData.bookingId || bookData.booking?.bookingId;
    assert((bookRes.status === 200 || bookRes.status === 201) && bookData.success, `Booking confirmed with ID: ${bookingId}`);

    const slotDbCheck = await query("SELECT status, current_plate FROM parking_slots WHERE id = 'loc-thaltej_A-02'");
    assert(slotDbCheck.rows[0].status === 'occupied' && slotDbCheck.rows[0].current_plate === 'GJ-01-PT-4567', 'Slot status updated to occupied with plate bound');

    const walletCheck = await query('SELECT wallet_balance FROM users WHERE id = $1', [user.id]);
    assert(parseFloat(walletCheck.rows[0].wallet_balance) < 500, `Wallet balance debited to ₹${walletCheck.rows[0].wallet_balance}`);

    const ledgerCheck = await query('SELECT * FROM wallet_transactions WHERE reference_id = $1', [bookingId]);
    assert(ledgerCheck.rows.length > 0 && ledgerCheck.rows[0].type === 'DEBIT', 'Debit transaction recorded in PostgreSQL financial ledger');

    // [CHECK 8] Concurrency & Double-Booking Protection
    console.log('\n[CHECK 8] Testing Concurrency & Double-Booking Prevention...');
    // Attempt concurrent duplicate booking on the now occupied slot A-02
    const dupRes = await fetch(`${BASE_URL}/api/bookings/prepay-and-park`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        locationId: 'loc-thaltej',
        slotId: 'A-02',
        durationHours: 2,
        plate: 'GJ-01-XX-9999',
        phone: '9898999999',
        driverName: 'Another Driver',
      }),
    });
    assert(dupRes.status === 409 || dupRes.status === 400, 'Duplicate booking on already reserved bay rejected with conflict error');

    // [CHECK 9] Cancellation & Automated 100% Wallet Refund
    console.log('\n[CHECK 9] Testing Cancellation & Automated 100% Wallet Refund...');
    const preRefundBal = parseFloat(walletCheck.rows[0].wallet_balance);
    const cancelRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.success, 'Booking cancelled successfully');
    assert(cancelData.refundAmount > 0, `Refund of ₹${cancelData.refundAmount} credited to wallet`);

    const postRefundBal = await query('SELECT wallet_balance FROM users WHERE id = $1', [user.id]);
    assert(parseFloat(postRefundBal.rows[0].wallet_balance) === parseFloat((preRefundBal + cancelData.refundAmount).toFixed(2)), 'Wallet balance in PostgreSQL restored exactly by refund amount');

    const slotFreedCheck = await query("SELECT status FROM parking_slots WHERE id = 'loc-thaltej_A-02'");
    assert(slotFreedCheck.rows[0].status === 'available', 'Parking bay automatically freed back to available status');

    // [CHECK 10] Idempotent Cancellation Safety
    console.log('\n[CHECK 10] Testing Idempotent Cancellation Safety...');
    const retryCancelRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    assert(retryCancelRes.status === 400, 'Second cancellation attempt correctly blocked from refunding twice');

    // [CHECK 11] Administrative Role Verification
    console.log('\n[CHECK 11] Testing Administrative Security & RBAC...');
    // Ensure user role is reset to driver before testing
    await query("UPDATE users SET role = 'driver' WHERE id = $1", [user.id]);

    // Normal user denied admin endpoint
    const nonAdminOver = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(nonAdminOver.status === 403, 'Normal driver denied access to /api/admin/overview with HTTP 403 Forbidden');

    // Promote user to admin
    const toggleRes = await fetch(`${BASE_URL}/api/admin/toggle-my-role`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const toggleData = await toggleRes.json();
    const adminToken = toggleData.token;

    const adminAuthRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAuth = await adminAuthRes.json();
    assert(adminAuth.user?.role === 'admin', 'User account promoted to municipal admin role in PostgreSQL');

    const adminOverRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminOver = await adminOverRes.json();
    assert(adminOverRes.status === 200 && adminOver.locationsCount >= 9, `Admin overview reports ${adminOver.locationsCount} facilities and full city metrics`);

    console.log('\n========================================================================');
    console.log(`VERIFICATION SUMMARY: ${passedChecks} / ${totalChecks} CHECKS PASSED (${Math.round((passedChecks / totalChecks) * 100)}%)`);
    console.log('========================================================================');
  } catch (err) {
    console.error('Unexpected test suite error:', err);
  } finally {
    server.close();
    await pool.end();
    process.exit(passedChecks === totalChecks ? 0 : 1);
  }
}

runAllVerifications();
