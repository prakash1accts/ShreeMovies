# Shree Movies — Cinema Ticket Booking App

A full working web app for a cinema business: customers browse movies, pick a showtime, choose seats on an interactive seat map, and pay online. You get an admin dashboard to manage movies, showtimes, and bookings.

Built with Next.js (React), TypeScript, Tailwind CSS, and Postgres.

## What's included

- **Movie catalog** — homepage grid of movies with poster, genre, rating, runtime.
- **Showtimes & seat selection** — pick a date/time, click seats on a visual seat map, seats lock while you check out and release automatically after 15 minutes if abandoned.
- **Accounts** — sign up / log in, booking history under "My Bookings."
- **Checkout & payment** — Stripe Checkout integration. Runs in demo mode (bookings auto-confirm, no real charge) until you add Stripe keys.
- **Admin dashboard** (`/admin`) — add/remove movies, schedule/cancel showtimes, view all bookings and revenue. Only accounts with the `admin` role can access it.

## Run it locally first

You need a Postgres database even for local testing — the free options below take about 2 minutes to set up and work fine for this too.

1. Get a free Postgres database at **[neon.tech](https://neon.tech)** (or supabase.com, or railway.app). Sign up, create a project, and copy the connection string it gives you (looks like `postgresql://user:password@host/dbname`).
2. Copy `.env.example` to `.env.local` and paste that connection string into `DATABASE_URL`.
3. Run:
   ```bash
   npm install
   npm run seed
   npm run dev
   ```
4. Open http://localhost:3000.

Seeded logins:

| Role | Email | Password |
|---|---|---|
| Admin | admin@cinema.demo | admin1234 |
| Customer | demo@cinema.demo | demo1234 |

The first real thing to do as admin is add your movies under **Admin → Movies**, then schedule showtimes under **Admin → Showtimes**.

## Going live at www.shreemovies.com

This is the exact path from what you have now to a live site at your own domain. Do these roughly in order.

### 1. Buy the domain

Register `shreemovies.com` at any registrar — Namecheap, Cloudflare, or GoDaddy are all fine (Cloudflare tends to be cheapest with no markup). This takes a few minutes and usually costs $10–15/year. You don't need to configure anything else yet — just get it registered.

### 2. Put the code on GitHub

Vercel deploys from a GitHub repository, so the code needs to live there first.

1. Create a free account at github.com if you don't have one.
2. Create a new empty repository (e.g. `shree-movies`).
3. In a terminal, inside this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/shree-movies.git
   git push -u origin main
   ```

### 3. Set up your production database

If you already made a Neon/Supabase database for local testing in the steps above, you can reuse it — or create a fresh one for production so test bookings don't mix with real ones. Either way, keep the connection string handy for the next step.

### 4. Deploy on Vercel

1. Go to vercel.com and sign up (free) — sign in with your GitHub account, it's the smoothest option.
2. Click **Add New → Project**, and select the `shree-movies` repository you just pushed.
3. Before clicking Deploy, expand **Environment Variables** and add:
   - `DATABASE_URL` — your Postgres connection string from step 3
   - `AUTH_SECRET` — generate one by running `openssl rand -base64 32` in a terminal and pasting the output
   - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — leave blank for now, we'll come back to these in step 6
4. Click **Deploy**. In about a minute you'll get a live URL like `shree-movies.vercel.app` — open it and confirm the site loads.
5. Run the seed script once against this production database from your own computer (with `DATABASE_URL` in `.env.local` pointed at the production database): `npm run seed`. This creates your admin login. After that, log in as admin on the live site and replace the sample movies with your real ones — you can leave the seeded admin account as-is or create a new admin manually in the database and remove the demo one.

### 5. Connect www.shreemovies.com to Vercel

1. In your Vercel project, go to **Settings → Domains** and add `www.shreemovies.com`.
2. Vercel will show you one or two DNS records to add (usually a `CNAME` for `www` pointing at `cname.vercel-dns.com`).
3. Go to your domain registrar's DNS settings (from step 1) and add exactly the records Vercel showed you.
4. DNS changes can take anywhere from a few minutes to a few hours to take effect. Vercel's dashboard will show the domain as "Valid" once it's live.
5. Optional but recommended: also add the bare `shreemovies.com` (no `www`) in the same Domains screen and set it to redirect to `www.shreemovies.com`, so both work.

### 6. Turn on real payments

1. Create a free Stripe account at stripe.com if you don't have one.
2. In the Stripe Dashboard, grab your **live** secret key (Developers → API keys) — starts with `sk_live_...`.
3. In Vercel, go to **Settings → Environment Variables** and set `STRIPE_SECRET_KEY` to that value, then redeploy (Vercel prompts you, or push any small change to GitHub to trigger it).
4. Back in Stripe, go to **Developers → Webhooks → Add endpoint**, set the URL to `https://www.shreemovies.com/api/stripe/webhook`, and select the `checkout.session.completed` event. Stripe gives you a signing secret (`whsec_...`) — add that to Vercel as `STRIPE_WEBHOOK_SECRET` and redeploy once more.
5. Test with a real card for a small real booking to confirm everything works end to end, then you're live.

That's the whole path: domain → GitHub → database → Vercel → DNS → Stripe. Steps 1–2 and 4–5 need your own accounts and payment details, so I can't do those for you directly — but I can help troubleshoot at any point, or make code changes if something needs adjusting (e.g. your actual seating layout, pricing rules, or branding).

### Optional add-ons

- **Transactional email** — right now booking confirmations only show on-screen. Connect Resend or Postmark to email customers a receipt; ask me and I'll wire it into the booking flow once you have an account.
- **SMS reminders** — Twilio is the standard choice if you want text reminders before showtime.

## Environment variables

See `.env.example` for the full list with descriptions. `DATABASE_URL` is required everywhere (local and production); everything else can stay blank while you're still testing.

## Project structure

```
src/
  app/
    page.tsx              Home page (movie listing)
    movies/[id]/           Movie detail + showtimes
    showtimes/[id]/         Seat selection + checkout
    booking/success, cancel  Post-checkout pages
    login/, signup/, account/  Auth + booking history
    admin/                 Admin dashboard (movies, showtimes, bookings)
    api/stripe/webhook/     Stripe payment confirmation webhook
    actions/                Server actions (the actual read/write logic)
  components/               Shared UI (nav, seat picker, forms)
  lib/                      Database, auth, Stripe helpers, types
scripts/
  seed.ts                  Sample data + demo accounts
```

## Notes on the seat map

Seats are laid out automatically as a grid (rows × columns) per screen when you create a showtime — the default is 8 rows × 10 seats, configurable per screen in the admin showtime form. If you send me a photo or diagram of your actual theater's seating layout, I can update the seat map to match it exactly (irregular rows, aisles, wheelchair spots, VIP sections, etc.) instead of a plain grid.
