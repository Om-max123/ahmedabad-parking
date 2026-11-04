import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, 'data', 'parking_dataset.csv');

export function parseCSVDataset() {
  if (!fs.existsSync(CSV_PATH)) {
    return [];
  }

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = fileContent.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ? values[idx].trim() : '';
    });
    records.push(obj);
  }

  return records;
}

export function generateSlotsFromDataset(locationId, locationName, hourlyBaseRate = 30) {
  const records = parseCSVDataset();

  // Distinct parking spots (1 to 50)
  const spotMap = new Map();

  // Ahmedabad driver sample pool
  const driversPool = [
    'Aarav Patel', 'Pooja Mehta', 'Rohan Shah', 'Kinjal Parekh', 'Vikram Desai',
    'Neha Trivedi', 'Karan Joshi', 'Dharmesh Soni', 'Ananya Dave', 'Hiren Solanki',
    'Siddharth Merchant', 'Tejas Raval', 'Manish Vora', 'Meera Patel', 'Chirag Bhatt'
  ];

  records.forEach((row, index) => {
    const spotIdNum = parseInt(row.Parking_Spot_ID, 10);
    if (!spotIdNum) return;

    // Keep the latest record for each spot ID
    spotMap.set(spotIdNum, row);
  });

  const slots = [];
  const entries = Array.from(spotMap.entries()).sort((a, b) => a[0] - b[0]);

  // Take up to 24-30 slots per location for clean presentation
  const selectedEntries = entries.slice(0, 24);

  selectedEntries.forEach(([spotIdNum, row], idx) => {
    const section = (row.Parking_Lot_Section || 'Zone A').replace('Zone ', '').trim().toUpperCase();
    const zone = ['A', 'B', 'C', 'D'].includes(section) ? section : (['A', 'B', 'C', 'D'][spotIdNum % 4]);
    
    // Type classification
    let type = 'compact';
    if (row.Electric_Vehicle === '1' || row.Vehicle_Type === 'Electric Vehicle') {
      type = 'ev';
    } else if (row.Vehicle_Type === 'Motorcycle') {
      type = 'bike';
    } else if (row.Reserved_Status === '1') {
      type = 'vip';
    } else if (row.Spot_Size === 'Oversized' || spotIdNum % 5 === 0) {
      type = 'suv';
    }

    const isOccupied = row.Occupancy_Status === 'Occupied';
    const durationHours = parseInt(row.Parking_Duration, 10) || 2;
    const now = Date.now();
    const parkedAt = now - durationHours * 3600 * 1000 - (spotIdNum * 4 * 60 * 1000);

    const plateCode = (spotIdNum * 137) % 9000 + 1000;
    const series = ['AB', 'BC', 'DX', 'EV', 'KL', 'MC', 'RF', 'VP'][spotIdNum % 8];
    const plate = `GJ-01-${series}-${plateCode}`;
    const driver = driversPool[idx % driversPool.length];

    const slotId = `${zone}-${spotIdNum < 10 ? '0' + spotIdNum : spotIdNum}`;

    slots.push({
      id: slotId,
      spotNumber: spotIdNum,
      zone,
      type,
      status: isOccupied ? 'occupied' : 'available',
      vehicle: isOccupied ? {
        plate,
        driver,
        type,
        phone: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        parkedAt,
        batteryLevel: type === 'ev' ? Math.floor(45 + Math.random() * 50) : null,
        userType: row.User_Type || 'Registered',
        paymentStatus: row.Payment_Status || 'Paid',
      } : null,
      sensor: {
        ultrasonic: parseFloat(row.Sensor_Reading_Ultrasonic) || 100,
        proximity: parseFloat(row.Sensor_Reading_Proximity) || 2.5,
        pressure: parseFloat(row.Sensor_Reading_Pressure) || 3.0,
        noise: parseFloat(row.Environmental_Noise_Level) || 50,
        temperature: parseFloat(row.Weather_Temperature) || 24,
        traffic: row.Nearby_Traffic_Level || 'Low',
        dynamicPricing: parseFloat(row.Dynamic_Pricing_Factor) || 1.0,
        spotSize: row.Spot_Size || 'Standard',
      },
    });
  });

  return slots;
}
