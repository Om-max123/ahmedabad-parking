export const VEHICLE_TYPES = {
  compact: { label: 'Compact / Sedan', icon: '🚗', baseRate: 5 },
  suv: { label: 'SUV / Truck', icon: '🚙', baseRate: 6 },
  ev: { label: 'Electric Vehicle (EV)', icon: '⚡', baseRate: 7 },
  bike: { label: 'Motorcycle / Bike', icon: '🏍️', baseRate: 3 },
  vip: { label: 'VIP / Luxury', icon: '✨', baseRate: 9 },
};

export const ZONES = [
  { id: 'ALL', name: 'All Zones', desc: 'All 24 Parking Bays' },
  { id: 'A', name: 'Zone A', type: 'Compact & Bikes', rate: '$3 - $5/hr', color: '#3B82F6' },
  { id: 'B', name: 'Zone B', type: 'Sedans & SUVs', rate: '$5 - $6/hr', color: '#10B981' },
  { id: 'C', name: 'Zone C', type: 'EV Fast Charging', rate: '$7/hr', color: '#06B6D4' },
  { id: 'D', name: 'Zone D', type: 'VIP & Reserved', rate: '$8 - $9/hr', color: '#F59E0B' },
];

export const INITIAL_SLOTS = [
  // Zone A (Compact / Bikes)
  { id: 'A-01', zone: 'A', type: 'bike', status: 'occupied', vehicle: { plate: 'MH-12-BK-9102', driver: 'Rahul S.', type: 'bike', parkedAt: Date.now() - 45 * 60 * 1000 } },
  { id: 'A-02', zone: 'A', type: 'bike', status: 'available' },
  { id: 'A-03', zone: 'A', type: 'compact', status: 'occupied', vehicle: { plate: 'KA-03-MR-2490', driver: 'Elena Rostova', type: 'compact', parkedAt: Date.now() - 110 * 60 * 1000 } },
  { id: 'A-04', zone: 'A', type: 'compact', status: 'available' },
  { id: 'A-05', zone: 'A', type: 'compact', status: 'available' },
  { id: 'A-06', zone: 'A', type: 'compact', status: 'occupied', vehicle: { plate: 'DL-01-TX-7744', driver: 'David Miller', type: 'compact', parkedAt: Date.now() - 25 * 60 * 1000 } },

  // Zone B (Standard Sedans & SUVs)
  { id: 'B-01', zone: 'B', type: 'suv', status: 'occupied', vehicle: { plate: 'NY-492-WXZ', driver: 'Marcus Vance', type: 'suv', parkedAt: Date.now() - 180 * 60 * 1000 } },
  { id: 'B-02', zone: 'B', type: 'compact', status: 'available' },
  { id: 'B-03', zone: 'B', type: 'compact', status: 'available' },
  { id: 'B-04', zone: 'B', type: 'suv', status: 'occupied', vehicle: { plate: 'CA-889-PLX', driver: 'Sarah Jenkins', type: 'suv', parkedAt: Date.now() - 65 * 60 * 1000 } },
  { id: 'B-05', zone: 'B', type: 'compact', status: 'available' },
  { id: 'B-06', zone: 'B', type: 'suv', status: 'available' },

  // Zone C (EV Charging Stations)
  { id: 'C-01', zone: 'C', type: 'ev', status: 'occupied', vehicle: { plate: 'EV-TESLA-33', driver: 'Alex Chen', type: 'ev', parkedAt: Date.now() - 85 * 60 * 1000, batteryLevel: 78 } },
  { id: 'C-02', zone: 'C', type: 'ev', status: 'available' },
  { id: 'C-03', zone: 'C', type: 'ev', status: 'occupied', vehicle: { plate: 'EV-HYUNDAI-5', driver: 'Priya Patel', type: 'ev', parkedAt: Date.now() - 35 * 60 * 1000, batteryLevel: 92 } },
  { id: 'C-04', zone: 'C', type: 'ev', status: 'available' },
  { id: 'C-05', zone: 'C', type: 'ev', status: 'available' },
  { id: 'C-06', zone: 'C', type: 'ev', status: 'available' },

  // Zone D (VIP / Prime)
  { id: 'D-01', zone: 'D', type: 'vip', status: 'occupied', vehicle: { plate: 'VIP-7777', driver: 'Jonathan Sterling', type: 'vip', parkedAt: Date.now() - 210 * 60 * 1000 } },
  { id: 'D-02', zone: 'D', type: 'vip', status: 'available' },
  { id: 'D-03', zone: 'D', type: 'vip', status: 'available' },
  { id: 'D-04', zone: 'D', type: 'vip', status: 'occupied', vehicle: { plate: 'VIP-BOSS-1', driver: 'Victoria Cole', type: 'vip', parkedAt: Date.now() - 140 * 60 * 1000 } },
  { id: 'D-05', zone: 'D', type: 'vip', status: 'available' },
  { id: 'D-06', zone: 'D', type: 'vip', status: 'available' },
];

export const DEMO_PRESETS = [
  { plate: 'TX-902-BBA', driver: 'Michael Scott', type: 'compact' },
  { plate: 'FL-334-ZZY', driver: 'Jim Halpert', type: 'suv' },
  { plate: 'EV-LUCID-99', driver: 'Pam Beesly', type: 'ev' },
  { plate: 'MOTO-RIDER', driver: 'Dwight Schrute', type: 'bike' },
  { plate: 'VIP-DUNDER', driver: 'Stanley Hudson', type: 'vip' },
];
