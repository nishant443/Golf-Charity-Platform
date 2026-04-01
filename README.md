# ⛳ Golf Charity Subscription Platform

A subscription-driven web application combining golf performance tracking, charity fundraising, and a monthly draw-based reward engine.

Built for the **Digital Heroes Full-Stack Development Trainee Selection Process**.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe |
| Auth | JWT + Supabase Auth |
| Deploy | Vercel (frontend) + Vercel Serverless / Railway (backend) |

---

## 📁 Project Structure

```
golf-charity-platform/
├── frontend/          # React Vite app
├── backend/           # Express API
├── supabase/          # DB schema & migrations
└── docs/              # Architecture diagrams
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- A new Supabase project
- A new Vercel account
- Stripe account (test keys)

---

### 1. Clone & Install

```bash
git clone <your-repo>
cd golf-charity-platform

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

---

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full schema from `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** from Project Settings → API

---

### 3. Environment Variables

**Backend** — create `backend/.env`:
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=your_very_long_random_secret_string
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:5173
```

**Frontend** — create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

---

### 4. Run Locally

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:5000

---

### 5. Stripe Webhook (local)

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

---

## 🧪 Test Credentials

After running the seed script (`cd backend && npm run seed`):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@golfcharity.com | Admin@123! |
| User | user@test.com | User@123! |

**Stripe Test Card:** `4242 4242 4242 4242` — any future date, any CVC

---

## 🚢 Deployment

### Backend → Vercel / Railway

```bash
cd backend
# Set env vars in your hosting dashboard
# Deploy via Git push or CLI
vercel --prod
```

### Frontend → Vercel

```bash
cd frontend
vercel --prod
# Set VITE_* env vars in Vercel dashboard
```

---

## ✅ Feature Checklist

- [x] User signup & login (JWT auth)
- [x] Subscription flow (monthly & yearly) via Stripe
- [x] Score entry — 5-score rolling logic (Stableford 1–45)
- [x] Monthly draw system with simulation mode
- [x] Charity selection & contribution calculation (min 10%)
- [x] Winner verification flow & payout tracking
- [x] Full user dashboard
- [x] Full admin panel
- [x] Responsive design (mobile-first)
- [x] Error handling & edge cases

---

## 📐 Architecture

See `docs/architecture.md` for data flow diagrams and schema decisions.

---

Built with ❤️ for Digital Heroes · digitalheroes.co.in
