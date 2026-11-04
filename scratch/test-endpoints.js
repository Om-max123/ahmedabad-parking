async function runTests() {
  console.log('--- Testing Ahmedabad Smart Parking API ---');

  // 1. Health & Database Info
  const dbInfo = await fetch('http://localhost:5001/api/database/info').then(r => r.json());
  console.log('1. Database Tables Count:', dbInfo.schema?.tables?.length);
  console.log('Tables:', dbInfo.schema?.tables?.map(t => `${t.name} (${t.recordCount} rows)`));

  // 2. Gate Status
  const gateStatus = await fetch('http://localhost:5001/api/gate/status').then(r => r.json());
  console.log('2. Gate Status:', gateStatus);

  // 3. User Login
  const loginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Mehra',
      phone: '9825012345',
      carNumber: 'GJ-01-RM-5566',
      vehicleType: 'sedan'
    })
  }).then(r => r.json());
  console.log('3. Login Result:', loginRes.user?.name, loginRes.user?.carNumber, 'Wallet:', loginRes.user?.walletBalance);

  // 4. Gate Arrival Verification
  const arrivalRes = await fetch('http://localhost:5001/api/gate/verify-arrival', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: 'loc-cg-road',
      carNumber: 'GJ-01-RM-5566',
      phone: '9825012345',
      driverName: 'Rohan Mehra',
      gateId: 'Gate A1 - North Barrier'
    })
  }).then(r => r.json());
  console.log('4. Gate Arrival Verified:', arrivalRes.verified, 'Token:', arrivalRes.arrivalToken);

  // 5. Check Wallet Balance
  const balRes = await fetch('http://localhost:5001/api/wallet/balance?phone=9825012345').then(r => r.json());
  console.log('5. Current Wallet Balance:', balRes.balance);

  // 6. Test Prepay-and-Park (Attempt without arrival token -> should fail with 403)
  const failRes = await fetch('http://localhost:5001/api/bookings/prepay-and-park', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: 'loc-cg-road',
      slotId: 'A-01',
      carNumber: 'GJ-01-RM-5566',
      phone: '9825012345',
      // No arrivalToken
    })
  });
  console.log('6. Prepay without gate arrival status code:', failRes.status, '(Expected 403)');

  // 7. Test Prepay-and-Park WITH arrivalToken
  // First find an available slot in loc-cg-road
  const locRes = await fetch('http://localhost:5001/api/locations/loc-cg-road').then(r => r.json());
  const freeSlot = locRes.slots.find(s => s.status === 'available');
  console.log('7. Selected available slot:', freeSlot?.id);

  if (freeSlot) {
    const parkRes = await fetch('http://localhost:5001/api/bookings/prepay-and-park', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: 'loc-cg-road',
        slotId: freeSlot.id,
        carNumber: 'GJ-01-RM-5566',
        phone: '9825012345',
        driverName: 'Rohan Mehra',
        vehicleType: 'sedan',
        durationHours: 2,
        arrivalToken: arrivalRes.arrivalToken,
        gateId: 'Gate A1 - North Barrier'
      })
    }).then(r => r.json());
    console.log('7. Prepay & Park Result:', parkRes.success, parkRes.message, 'Remaining Wallet Balance:', parkRes.remainingBalance);
  }

  // 8. Test Wallet Transactions table query
  const wtxTable = await fetch('http://localhost:5001/api/database/table/wallet_transactions').then(r => r.json());
  console.log('8. Wallet Transactions in PostgreSQL:', wtxTable.rowCount, 'rows. Latest tx:', wtxTable.rows?.[0]);
}

runTests().catch(console.error);
