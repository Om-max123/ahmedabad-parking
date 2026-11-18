# LinkedIn post: Ahmedabad Smart Parking

Attach `demo-video/ahmedabad-smart-parking-demo.mp4` to the post.

---

Finding parking on CG Road at 7 pm is its own kind of sport. So for my Web Application Development final project I built a system that lets you reserve a bay before you get there.

Ahmedabad Smart Parking covers 9 hubs across the city: CG Road, Vastrapur, Sindhu Bhavan, the Riverfront and more. You can see free bays live, prepay from a wallet, and leave with a GST receipt.

What it does:
• Live availability for 240 bays, with a city map and a bay-by-bay grid
• Wallet top-ups, with every rupee recorded in a transaction ledger
• Booking prepays the tariff plus 5% GST. Stay longer and the extra hours are charged at checkout
• Cancel within 15 minutes for a full refund. After that you get back the hours you didn't use
• An admin view for city operators, a vehicle registry, and an analytics page

Under the hood:
• React 19 + Vite on the frontend
• Node.js / Express API with signed session tokens and role-based access
• PostgreSQL with 7 related tables. Each booking runs as one transaction with row locks, so two drivers can't grab the same bay and a failed payment leaves nothing half-written

The part that taught me the most was the money logic. My first version refunded 100% on every cancellation, which meant you could park all day and pay nothing. Writing the rules for overstays, partial refunds and revenue net of refunds took longer than any screen in the app.

Try it: https://ahmedabad-parking.vercel.app
Code: https://github.com/Om-max123/ahmedabad-parking

Feedback is very welcome, especially from anyone who has worked on real parking or payments systems.

#WebDevelopment #React #NodeJS #PostgreSQL #FullStack #Ahmedabad #StudentProject
