# Ahmedabad Municipal Smart Parking & Urban Mobility Platform

An enterprise-grade, full-stack Smart Parking Management and Mobility Ledger web application tailored for Ahmedabad's high-density traffic hubs (Thaltej, CG Road, Vastrapur Lake, Sabarmati Riverfront, Sindhu Bhavan, Prahlad Nagar, Manek Chowk, Law Garden, and Kankaria Lake).

Built with **React 19 + Vite**, **Node.js + Express 5**, **PostgreSQL 16 relational database**, **Google Maps JavaScript API**, **Google Identity Services (GIS) OAuth 2.0**, and **Vercel Serverless Architecture**.

---

## 🌟 Main User Journey & Features

1. **Public Landing & Service Area Explorer**:
   - Clean mobility interface explaining the service area and 9 municipal hubs across Ahmedabad.
   - City search bar with instant autocomplete for neighborhoods like **Thaltej**, **Navrangpura**, **Vastrapur**, **Bodakdev**, and **Riverfront**.
   - GPS-powered *"Nearest to Me"* distance calculator using the Haversine formula (with explicit user permission prompt).

2. **Authentication & Identity**:
   - **Google Sign-In** via Google Identity Services (GIS) / OAuth 2.0 token verification with server-verified JWT sessions.
   - Transparent **Development / Demo Sign-In** fallback with 1-click test driver profiles (Karan Patel, Meera Shah EV, Vikram Desai, Municipal Admin Operator).
   - Strict server-side route guards: unauthenticated requests to booking, wallet, vehicle registry, or profile APIs return `HTTP 401 Unauthorized`.

3. **Vehicle Registry & Verification**:
   - Register, manage, and delete vehicles with Gujarat RTO plate normalization (e.g. `GJ-01-AB-1234`).
   - Transparent verification status: labeled as *"Pending Official MoRTH RTO Verification (Municipal Demo Mode)"* since live government Vahan API access requires department authorization.
   - Set default vehicle for 1-click reservations.

4. **Synchronized City Map & Locality Search**:
   - Real interactive **Google Maps** (using `VITE_GOOGLE_MAPS_API_KEY`) centered on Ahmedabad with custom styled pins, occupancy states, and direct Google Maps driving navigation links.
   - Graceful fallback: If the Maps key is missing or restricted, the UI seamlessly renders an interactive vector radar map of Ahmedabad with Sabarmati river overlay and synchronized facility cards.
   - Selecting a card centers the map pin; clicking a map pin highlights and scrolls to the card.
   - Honest no-results UI with suggested locality pills when an unmapped area (e.g. Bopal) is queried.

5. **24-Bay Facility Grid & Real-time Sensor Telemetry**:
   - Multi-level bay visualization (Zone A: Compact, Zone B: Sedans/SUVs, Zone C: EV Charging, Zone D: VIP).
   - Simulated IoT sensor readings: ultrasonic distance, proximity, floor pressure, noise dB, temperature, and traffic levels.

6. **ACID-Compliant Server-Side Booking & Digital Wallet**:
   - **PostgreSQL Transactions with Row-Level Locking** (`SELECT ... FOR UPDATE` on slot and user wallet).
   - Server recalculates pricing based on trusted hourly rate + 5% transparent municipal cess; client-submitted prices are rejected.
   - Double-booking prevention: concurrent attempts on the same slot fail safely with `HTTP 409 Conflict`.
   - Immutable digital wallet financial ledger (`wallet_transactions` table) tracking running balances, credits, and debits.

7. **Cancellations & 100% Automated Refunds**:
   - Cancel active bookings directly from the "My Passes" modal.
   - Server transaction sets booking to `cancelled`, restores wallet balance, writes a `CREDIT` refund ledger entry, and frees the parking bay back to `available`.
   - Safe idempotency: retried cancellation requests do not issue duplicate refunds.

8. **Municipal Traffic Command & Administration (RBAC)**:
   - Server-enforced role checks (`requireAdmin` middleware). Non-admins receive `HTTP 403 Forbidden`.
   - Admin view with city-wide overview statistics (locations count, total capacity, occupancy rate, financial volume).
   - Ability to register new municipal locations and seed parking bays directly into PostgreSQL.
   - City-wide booking audit trail with status filters.
   - One-click role toggle for developer testing.

---

## 🗄️ PostgreSQL Database Architecture (7 Relational Tables)

Managed via **PostgreSQL 16** with foreign keys, checks, indexes, and numeric currency safety:

1. **`locations`** (11 columns): GPS coordinates, area, tariffs, ratings, live capacity. Includes `loc-thaltej`, `loc-cg-road`, `loc-vastrapur`, etc.
2. **`parking_slots`** (21 columns): Bay code, spot number, zone, vehicle bindings, sensor telemetry (ultrasonic, proximity, pressure, temperature, dynamic pricing factor).
3. **`users`** (11 columns): Driver ID, name, email, Google ID, avatar URL, mobile number, vehicle plate, wallet balance (`NUMERIC(10,2)`), role (`driver` or `admin`).
4. **`vehicle_owners`** (18 columns): User ID foreign key, owner name, phone, email, plate (`car_number`), make, model, type, fuel, FASTag ID, verification status (`pending_official_verification`), default vehicle flag.
5. **`bookings`** (19 columns): Booking ID, user ID, location ID, slot ID, plate, hourly rate, duration, status (`active`, `completed`, `cancelled`), gate check-in verification, payment status, idempotency key.
6. **`receipts`** (10 columns): Fiscal invoices, subtotal, 5% tax, total amount, payment method (`SMART_WALLET`), duration text, billing timestamps.
7. **`wallet_transactions`** (9 columns): Financial ledger audit trail, user ID, plate, transaction type (`CREDIT` or `DEBIT`), amount, description, reference ID (`booking_id`), running balance after transaction.

---

## 🧩 Database Engine Selection (No Install Required)

On startup the backend tries the PostgreSQL server in `DATABASE_URL`. If none is reachable, it automatically
starts an **embedded PostgreSQL engine (PGlite)** inside Node.js and runs the same `schema.sql`, migrations and seed data.

| Where | No `DATABASE_URL` / server down | Cloud `DATABASE_URL` set (e.g. Neon) |
|-------|------------------------------|--------------------------------------|
| Local (`npm start`) | PGlite, data saved in `server/data/pgdata` | External PostgreSQL |
| Vercel | PGlite in memory (resets on cold start) | External PostgreSQL (persistent) |

For permanent data on Vercel, add a Neon/Supabase connection string as the `DATABASE_URL` environment variable.

## 🐘 pgAdmin 4 Connection Guide

pgAdmin 4 is a client management tool that connects to your PostgreSQL server:

1. Open **pgAdmin 4** on your machine.
2. Under **Servers**, right-click **Servers** → **Register** → **Server...**:
   - **General Tab**:
     - Name: `Ahmedabad Smart Parking (Local)` or `Ahmedabad Smart Parking (Cloud)`
   - **Connection Tab**:
     - **Host name / address**: `localhost` (or cloud host e.g. `ep-cool-sample.ap-southeast-1.aws.neon.tech`)
     - **Port**: `5432`
     - **Maintenance database**: `wad_parking`
     - **Username**: `postgres` (or your cloud PG user)
     - **Password**: `postgres` (or your cloud PG password)
     - **SSL Mode**: `Prefer` (or `Require` for Supabase / Neon cloud databases)
   - Click **Save**.
3. In the object tree, expand:
   ```
   Databases > wad_parking > Schemas > public > Tables
   ```
4. Right-click any table (e.g. `bookings`, `wallet_transactions`, `vehicle_owners`, `locations`) → **View/Edit Data** → **All Rows**.
5. To query live ledger transactions directly, open **Tools > Query Tool**:
   ```sql
   -- View wallet financial ledger:
   SELECT id, user_id, car_number, type, amount, description, balance_after, created_at
   FROM public.wallet_transactions
   ORDER BY created_at DESC;

   -- View active parking reservations in Thaltej:
   SELECT booking_id, plate, driver_name, slot_id, status, parked_at
   FROM public.bookings
   WHERE location_id = 'loc-thaltej' AND status = 'active';
   ```

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the project root based on `.env.example`:

```bash
# =========================================================================
# PUBLIC FRONTEND VARIABLES (Included in client bundle)
# =========================================================================

# Google Maps JavaScript API Browser Key
# Visible to browsers by design. Restrict in Google Cloud Console by website referrer.
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_api_key_here

# Google OAuth 2.0 Web Client ID
# Configured in Google Cloud Console with authorized Javascript origin http://localhost:5173
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here.apps.googleusercontent.com

# Frontend API Base URL (leave empty in production for relative paths)
VITE_API_URL=http://localhost:5001

# =========================================================================
# PRIVATE SERVER-SIDE CREDENTIALS (Never exposed to browsers)
# =========================================================================

# Port for backend API server
PORT=5001

# Cryptographic token signing secret for session JWTs
JWT_SECRET=your_secure_session_secret_change_in_production
SESSION_SECRET=your_secure_session_secret_change_in_production

# Google OAuth Server Verification Client ID
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here.apps.googleusercontent.com

# PostgreSQL Connection String (Local or Cloud Supabase/Neon/Railway)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wad_parking

# Alternative individual PG credentials (if DATABASE_URL is not set)
PGUSER=postgres
PGPASSWORD=postgres
PGHOST=localhost
PGPORT=5432
PGDATABASE=wad_parking
```

---

## 🔑 Google Cloud Console Setup Instructions

### 1. Google Maps JavaScript API
1. Navigate to [Google Cloud Console → APIs & Services → Library](https://console.cloud.google.com/apis/library).
2. Enable **Maps JavaScript API** and **Places API**.
3. Go to **Credentials** → click your API Key.
4. Under **Application restrictions**, choose **Websites (HTTP referrers)**:
   - For Local Development: `http://localhost:*/*` and `http://127.0.0.1:*/*`
   - For Production / Vercel: `https://*.vercel.app/*` and `https://your-custom-domain.com/*`
5. Under **API restrictions**, select **Restrict key** and check:
   - Maps JavaScript API
   - Places API
6. Copy key to `VITE_GOOGLE_MAPS_API_KEY` in `.env`.

### 2. Google OAuth 2.0 Client ID
1. Navigate to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials** → **OAuth client ID**.
3. Select Application type: **Web application**.
4. Name: `Ahmedabad Smart Parking Web App`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost:5001`
   - `https://your-project.vercel.app`
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173`
   - `https://your-project.vercel.app`
7. Copy the generated Client ID to `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` in `.env`.

*(Note: If Google OAuth is not yet configured, the app will display a helpful setup prompt and provide the secure **Development / Demo Sign-In** fallback so you can test all features immediately).*

---

## 🚀 Running the Application Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations & Seed Dataset
```bash
# Run schema validation, safe enhancements, and seed all 9 Ahmedabad facilities + dataset bays:
npm run db:migrate

# Apply incremental integrity enhancements (row locks, unique partial indexes):
node server/safe-migrate.js
```

### 3. Start Application
```bash
# Terminal 1: Start Backend API (Port 5001)
npm run server

# Terminal 2: Start Vite React Frontend (Port 5173)
npm run dev
```

- **Frontend Application**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API Health**: [http://localhost:5001/api/health](http://localhost:5001/api/health)
- **Database Status**: [http://localhost:5001/api/database/info](http://localhost:5001/api/database/info)

---

## 🧪 Comprehensive Verification Suite

Run the automated 27-check end-to-end verification suite:

```bash
node scratch/verify-all-stages.js
```

This verifies:
- PostgreSQL connection & 7-table schema validation
- Municipal dataset retrieval & Thaltej locality search
- Honest no-results handling for unmapped queries
- Unauthorized route guard enforcement (HTTP 401)
- Driver registration & JWT session issuance
- Vehicle registry management & verification status labeling
- Insufficient balance rejection without database mutation
- Valid booking with row-level locking & ledger debit
- Concurrency conflict handling (HTTP 409)
- 100% automated cancellation refund to digital wallet
- Idempotent cancellation protection (no double refunds)
- Administrative RBAC & municipal traffic command endpoints (HTTP 403 / 200)

---

## ☁️ Vercel Production Deployment Guide

The application is pre-configured for seamless Vercel deployment using serverless functions and static frontend compilation:

- **`vercel.json`**: Configured to route `/api/(.*)` to `api/index.js` and serve the Vite SPA `dist` directory.
- **`api/index.js`**: Serverless adapter exporting the Express application.

### Deployment Steps:

1. **Push your code to GitHub / GitLab / Bitbucket**:
   ```bash
   git add .
   git commit -m "feat: complete Ahmedabad parking reservation system"
   git push origin main
   ```

2. **Import Project into Vercel**:
   - Go to [vercel.com](https://vercel.com) → click **Add New...** → **Project**.
   - Select your Git repository.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.

3. **Configure Vercel Environment Variables**:
   In the Vercel Project Settings → **Environment Variables**, add:
   - `DATABASE_URL`: Your cloud PostgreSQL connection string (from Neon / Supabase / Railway with `?sslmode=require`).
   - `JWT_SECRET`: A strong 32+ character random secret string.
   - `SESSION_SECRET`: A strong 32+ character random secret string.
   - `VITE_GOOGLE_MAPS_API_KEY`: Your restricted Google Maps API Key.
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Web Client ID.
   - `GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Web Client ID.

4. **Click Deploy**:
   Vercel compiles the React application and deploys the Express serverless API routes under `https://your-project.vercel.app/api/*`.
