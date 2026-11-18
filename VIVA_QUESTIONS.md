# Viva preparation: Ahmedabad Smart Parking

## 1. Which part is written in which language

| Part | Language / technology | Where in the project | Size |
|---|---|---|---|
| User interface (all screens, forms, modals) | **JavaScript (JSX) with React 19** | `src/App.jsx`, `src/components/*.jsx` (22 components) | ~7,500 lines |
| Styling and layout | **CSS** (plain CSS with variables, no Tailwind) | `src/App.css`, `src/index.css` | ~7,200 lines |
| Page shell | **HTML** | `index.html` (React mounts into `<div id="root">`) | 18 lines |
| Build tool / dev server | **Vite 8** (JavaScript) | `vite.config.js` | |
| Backend REST API | **JavaScript (Node.js) with Express 5** | `server/server.js` | ~2,800 lines |
| Login tokens / security | **JavaScript (Node.js `crypto`, HMAC-SHA256)** | `server/auth.js` | |
| Database connection | **JavaScript with `pg` (node-postgres)** | `server/db.js` | |
| Database tables | **SQL (PostgreSQL)** | `server/schema.sql`, `server/safe-migrate.js` | 7 tables |
| Database (live) | **PostgreSQL on Supabase** | set by Vercel as `POSTGRES_URL` | |
| Database (local, no install) | **PGlite**: PostgreSQL compiled to WebAssembly | used automatically by `server/db.js` | |
| Schema model (documentation / seeding) | **Prisma schema language** | `prisma/schema.prisma`, `prisma/seed.js` | not used at runtime |
| Parking sensor dataset | **CSV** read by JavaScript | `server/data/parking_dataset.csv`, `server/datasetLoader.js` | |
| Seed and backup data | **JSON** | `server/data/*.json` | |
| Serverless entry for Vercel | **JavaScript** | `api/index.js` | |
| Hosting configuration | **JSON** | `vercel.json` | |
| Code quality | **oxlint** (JavaScript linter) | `.oxlintrc.json` | |

**One-line answer:** "The frontend is React (JavaScript/JSX) with CSS, the backend is Node.js with Express (JavaScript), and the database is PostgreSQL using SQL, hosted on Supabase. The whole thing is deployed on Vercel."

---

## 2. Project basics

**Q1. What does your project do?**
It lets a driver in Ahmedabad see free parking bays in 9 hubs, top up a wallet, prepay for a bay (tariff + 5% GST), get a digital gate pass, and get a receipt at exit. Admins can see all bookings and add new hubs.

**Q2. What problem does it solve?**
Drivers waste time circling busy areas like CG Road looking for parking. This shows free bays in advance and guarantees a spot by prepaying.

**Q3. Who are the users?**
Drivers (book and pay), and admin operators (monitor bookings, add locations).

**Q4. Why is it called full-stack?**
I built all three layers: frontend (React), backend (Node/Express API), and database (PostgreSQL), and deployed it.

---

## 3. Frontend (React, JSX, CSS)

**Q5. Why React?**
It is component-based, so each part (navbar, booking form, receipt) is a reusable component. The UI updates automatically when state changes.

**Q6. What is JSX?**
A syntax that lets you write HTML-like tags inside JavaScript. Vite compiles it to plain JavaScript (`React.createElement` calls).

**Q7. Which React hooks did you use?**
- `useState`: wallet balance, logged-in user, which modal is open
- `useEffect`: load locations and bookings when the page opens
- `useCallback`: keep fetch functions stable
- `useMemo`: filter bays by zone and status without recalculating every render
- `useRef`: hold the Google Map instance

**Q8. How does the frontend talk to the backend?**
Using `fetch()` to call REST endpoints like `/api/bookings/prepay-and-park`, sending JSON and a `Authorization: Bearer <token>` header.

**Q9. Where is the login kept after refresh?**
The token and user are saved in `localStorage`. On page load the app calls `/api/auth/me` to check the token is still valid.

**Q10. What is Vite?**
A fast build tool and dev server. `npm run dev` starts it with hot reload; `npm run build` creates optimised files in `dist/`. In development it proxies `/api` calls to the backend on port 5001.

**Q11. How did you make it responsive?**
CSS grid and flexbox, `minmax(0, 1fr)` columns so content can't overflow, and `@media` queries that wrap the header and make tabs scroll on phones.

**Q12. What happens if Google Maps fails?**
The app detects the error (bad key or billing off) and shows its own built-in city map with the hub pins instead.

---

## 4. Backend (Node.js, Express)

**Q13. Why Node.js and Express?**
Same language (JavaScript) on frontend and backend, non-blocking I/O handles many requests, and Express makes defining REST routes simple.

**Q14. What is a REST API? Give examples from your project.**
Endpoints that use HTTP methods on resources:
- `GET /api/locations`: list hubs
- `POST /api/auth/login`: sign in
- `POST /api/wallet/topup`: add money
- `POST /api/bookings/prepay-and-park`: book a bay
- `POST /api/bookings/:id/cancel`: cancel and refund
- `POST /api/bookings/checkout`: exit and receipt
- `GET /api/admin/overview`: admin only

**Q15. What is middleware? Which did you use?**
A function that runs before the route handler. `cors()`, `express.json()`, `requireAuth` (checks the token), `requireAdmin` (checks the role), and a database-ready check.

**Q16. Which HTTP status codes does your API return?**
200 OK, 201 Created (booking), 400 bad input, 401 not logged in, 402 insufficient wallet balance, 403 not allowed (not admin / not your car), 404 not found, 409 conflict (bay already taken, plate owned by another number), 500 server error, 503 database unavailable.

---

## 5. Database (PostgreSQL, SQL)

**Q17. Why PostgreSQL and not MongoDB?**
The data is relational (users → bookings → receipts) and involves money, so I need foreign keys and ACID transactions.

**Q18. Name your tables.**
`users`, `locations`, `parking_slots`, `bookings`, `receipts`, `wallet_transactions`, `vehicle_owners`.

**Q19. Give a primary key and a foreign key example.**
`bookings.booking_id` is the primary key. `bookings.user_id` references `users(id)`, `bookings.slot_id` references `parking_slots(id)`, and `receipts.booking_id` references `bookings(booking_id)`.

**Q20. What is a transaction? Where did you use one?**
A group of SQL statements that all succeed or all fail. Booking runs `BEGIN` → lock bay → check balance → debit wallet → insert ledger entry → mark bay occupied → insert booking → insert receipt → `COMMIT`. If anything fails, `ROLLBACK` and nothing changes.

**Q21. What does ACID mean?**
Atomicity (all or nothing), Consistency (rules always hold), Isolation (parallel transactions don't interfere), Durability (committed data survives crashes).

**Q22. How do you prevent two drivers booking the same bay?**
`SELECT ... FROM parking_slots WHERE id = $1 FOR UPDATE` locks that row until the transaction ends. The second driver waits, then sees the bay is occupied and gets 409. I tested this with 4 bookings at once: exactly one succeeded.

**Q23. How do you prevent SQL injection?**
Parameterised queries: `query('SELECT * FROM users WHERE id = $1', [userId])`. User input is never joined into the SQL string.

**Q24. What are indexes and did you use them?**
They speed up lookups. 14 B-tree indexes, e.g. on `parking_slots(location_id)`, `bookings(status)`, `bookings(plate)`.

**Q25. What is Supabase?**
A hosted PostgreSQL service. My live site's backend connects to it through Supabase's connection pooler using SSL.

**Q26. What is PGlite and why is it there?**
Real PostgreSQL compiled to WebAssembly that runs inside Node.js. If no PostgreSQL server is installed locally, the app uses it automatically, so it runs on any laptop with no setup. On Vercel it is never used because Supabase is configured.

---

## 6. Security

**Q27. How does login work?**
Driver enters name, mobile number and plate. The server finds or creates the user by mobile number and returns a signed token. Every protected request sends this token.

**Q28. How is the token secured?**
It is signed with HMAC-SHA256 using a secret key (`JWT_SECRET`). The server recomputes the signature and compares with `crypto.timingSafeEqual`. Tokens expire after 7 days.

**Q29. What is role-based access control?**
Users have a role (`driver` or `admin`). `requireAdmin` blocks admin routes for drivers with 403. Even resetting the system needs admin.

**Q30. What is an idempotency key?**
A unique ID sent with a payment. If the same request arrives twice (double click, retry), the server sees the key already exists and does not charge again.

**Q31. Can someone log into another driver's account using their plate?**
No. The mobile number is the account identity. Using a plate registered to a different number returns 409.

---

## 7. Business logic

**Q32. How is the parking fee calculated?**
`hourly rate × hours`, plus 5% GST. Example: ₹30/hr × 2 hrs = ₹60 + ₹3 GST = ₹63.

**Q33. What happens if a driver stays longer than prepaid?**
At checkout, extra hours (rounded up) are charged at the same rate + GST, debited from the wallet, logged in the ledger, and added to the receipt.

**Q34. What is your refund policy?**
Full refund if cancelled within 15 minutes of booking. After that, only the unused prepaid hours are refunded.

**Q35. How is "Today's Collections" calculated?**
Sum of today's receipts minus any refunds, using India time (`Asia/Kolkata`).

---

## 8. Deployment and tools

**Q36. Where is it deployed?**
Vercel. The React build is served as static files; the Express API runs as a serverless function (`api/index.js`). `vercel.json` routes `/api/*` to the function and everything else to `index.html`.

**Q37. What is a serverless function?**
Code that runs on demand on the provider's servers, without me managing a server. Vercel may run several copies at once, which is why the database must be shared (Supabase), not stored in memory.

**Q38. What problem did you face in deployment?**
At first the database lived in each server instance's memory, so users got logged out when a request hit a different instance. Moving to Supabase (one shared database) fixed it.

**Q39. How is the code deployed after a change?**
Pushing to the `main` branch on GitHub triggers Vercel to build and deploy automatically.

**Q40. Which tools did you use?**
VS Code, Git and GitHub, npm, Vite, Vercel, Supabase, pgAdmin, oxlint, and Playwright for automated browser testing.

**Q41. How did you test it?**
An automated API test (about 40 checks: login, wallet, booking, cancel, checkout, admin, security), plus a browser test that clicks through every screen like a real user. I also ran 4 tests in parallel to check double booking.

---

## 9. Reflection

**Q42. Biggest challenge?**
The money logic. My first version refunded 100% on every cancel, so you could park all day for free. I fixed it with the 15-minute rule, overstay charges, and revenue that subtracts refunds.

**Q43. What would you add next?**
A real UPI payment gateway (e.g. Razorpay), real FASTag/ANPR gate integration, SMS or WhatsApp alerts, and a mobile app.

**Q44. What did you learn?**
Database transactions and locking, building secure REST APIs, handling serverless deployment, and testing an app the way a real user uses it.

---

## 10. Quick-fire answers

| Question | Answer |
|---|---|
| Frontend language | JavaScript (JSX) with React 19 |
| Styling | CSS |
| Backend language | JavaScript on Node.js, Express 5 framework |
| Database | PostgreSQL (Supabase online, PGlite locally) |
| Query language | SQL |
| Build tool | Vite |
| Hosting | Vercel |
| Version control | Git + GitHub |
| Token signing | HMAC-SHA256 |
| Number of tables | 7 |
| Number of parking hubs | 9 |
| GST rate | 5% |
| Free cancellation window | 15 minutes |
| Backend port (local) | 5001 |
| Frontend port (local) | 5173 |
| Run locally | `npm install`, then `npm start` (API) and `npm run dev` (frontend) |
