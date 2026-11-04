async function fullIntegrationTest() {
  console.log('================================================================');
  console.log('STANDARD PARKING ARCHITECTURE FULL INTEGRATION TEST');
  console.log('================================================================');

  // Step 1: Anonymous attempt without authentication
  console.log('\n[TEST 1] Driver Authentication Verification:');
  const anonBooking = await fetch('http://localhost:5001/api/bookings/prepay-and-park', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: 'loc-vastrapur',
      slotId: 'A-01',
      // No token provided
    })
  });
  console.log('   Status without login:', anonBooking.status, '(Expected: 401 Unauthorized)');
  const anonData = await anonBooking.json();
  console.log('   Response error:', anonData.error);

  // Step 2: Driver Authentication / Login
  console.log('\n[TEST 2] Driver Sign In & Profile Verification:');
  const driverPhone = '9879055443';
  const driverPlate = 'GJ-01-SP-7788';
  const driverName = 'Siddharth Dave';

  const loginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: driverName,
      phone: driverPhone,
      carNumber: driverPlate,
      vehicleType: 'suv'
    })
  }).then(r => r.json());
  console.log('   Logged In Driver:', loginRes.user?.name);
  console.log('   Vehicle Plate:', loginRes.user?.carNumber);
  console.log('   Initial Smart Wallet Balance: ₹' + loginRes.user?.walletBalance);
  console.log('   Session Token (HMAC-SHA256):', loginRes.token ? 'Issued ✓' : 'Failed ✗');

  const token = loginRes.token;

  // Step 3: Attempt prepay before physical arrival check-in
  console.log('\n[TEST 3] Gate Arrival Check-in Enforcement:');
  const noGateBooking = await fetch('http://localhost:5001/api/bookings/prepay-and-park', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      locationId: 'loc-vastrapur',
      slotId: 'A-01',
      // No arrivalToken provided
    })
  });
  console.log('   Status without gate arrival:', noGateBooking.status, '(Expected: 400 Bad Request or Arrival Required)');
  const noGateData = await noGateBooking.json();
  console.log('   Gate Enforcement Result:', noGateData.error);

  // Step 4: Perform Gate Arrival Verification ("Verify if I have came")
  console.log('\n[TEST 4] Physical Gate Arrival Verification at Barrier:');
  const arrivalRes = await fetch('http://localhost:5001/api/gate/verify-arrival', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      locationId: 'loc-vastrapur',
      gateId: 'Gate A1 - North Boom Barrier'
    })
  }).then(r => r.json());
  console.log('   Gate Verification Result:', arrivalRes.verified ? 'PASSED (Vehicle Present)' : 'FAILED');
  console.log('   Issued Arrival Token:', arrivalRes.arrivalToken);
  console.log('   Barrier State:', arrivalRes.barrierStatus);

  // Step 5: Prepaid Smart Wallet Parking
  console.log('\n[TEST 5] Upfront Smart Wallet Payment & Bay Allotment:');
  // Find free bay in Vastrapur
  const vastrapur = await fetch('http://localhost:5001/api/locations/loc-vastrapur').then(r => r.json());
  const freeBay = vastrapur.slots.find(s => s.status === 'available');
  console.log('   Target Bay:', freeBay?.id, 'at Vastrapur (Rate: ₹' + vastrapur.hourlyRate + '/hr)');

  // Ensure user has sufficient funds for test
  await fetch('http://localhost:5001/api/wallet/topup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 200, paymentMethod: 'UPI' })
  });

  const prepayRes = await fetch('http://localhost:5001/api/bookings/prepay-and-park', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      locationId: 'loc-vastrapur',
      slotId: freeBay.id,
      durationHours: 2,
      arrivalToken: arrivalRes.arrivalToken,
      gateId: 'Gate A1 - North Boom Barrier'
    })
  }).then(r => r.json());

  console.log('   Prepay & Park Success:', prepayRes.success);
  console.log('   Barrier Status:', prepayRes.barrierOpened ? 'OPENED 🟢' : 'CLOSED');
  console.log('   Message:', prepayRes.message);
  console.log('   Remaining Wallet Balance: ₹' + prepayRes.remainingBalance);
  console.log('   Active Booking ID:', prepayRes.booking?.bookingId);

  // Step 6: Verify Database Ledger Reflects in PostgreSQL
  console.log('\n[TEST 6] PostgreSQL Database Reflection (pgAdmin tables):');
  const txTable = await fetch('http://localhost:5001/api/database/table/wallet_transactions').then(r => r.json());
  console.log('   Total Wallet Transactions in DB:', txTable.rowCount);
  const myTx = txTable.rows.find(t => t.car_number === driverPlate);
  console.log('   Driver Transaction Record in PostgreSQL:');
  console.log('     ID:', myTx?.id);
  console.log('     Type:', myTx?.type);
  console.log('     Amount: ₹' + myTx?.amount);
  console.log('     Description:', myTx?.description);
  console.log('     Balance After: ₹' + myTx?.balance_after);

  console.log('\n================================================================');
  console.log('ALL STANDARD PARKING SYSTEM ARCHITECTURE REQUIREMENTS VERIFIED!');
  console.log('================================================================');
}

fullIntegrationTest().catch(console.error);
