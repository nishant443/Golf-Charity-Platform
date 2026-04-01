# Architecture & Data Flow

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│  React 18 · Vite · TailwindCSS · Zustand · React Query  │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS / REST API
┌──────────────────────▼───────────────────────────────────┐
│                 BACKEND (Node / Express)                  │
│  Auth · Scores · Subscriptions · Draws · Admin           │
│  JWT · bcrypt · express-validator · Helmet · CORS        │
└──────────┬─────────────────────────────┬─────────────────┘
           │                             │
┌──────────▼──────────┐    ┌────────────▼────────────────┐
│   Supabase (Postgres)│    │     Stripe (Payments)        │
│  Users · Scores      │    │  Checkout · Webhooks         │
│  Draws · Charities   │    │  Subscription lifecycle      │
│  Verifications · RLS │    └─────────────────────────────┘
└─────────────────────┘
```

---

## Data Models

### users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto |
| email | TEXT UNIQUE | |
| password_hash | TEXT | bcrypt(10) |
| full_name | TEXT | |
| role | ENUM | subscriber / admin |
| handicap | NUMERIC(4,1) | optional |
| avatar_url | TEXT | |

### subscriptions
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | → users |
| plan | ENUM | monthly / yearly |
| status | ENUM | active / inactive / cancelled / lapsed |
| stripe_customer_id | TEXT | |
| stripe_subscription_id | TEXT | |
| amount_paid | NUMERIC | £9.99 or £99.99 |
| charity_id | UUID FK | → charities |
| charity_percentage | NUMERIC | min 10% |
| next_renewal_at | TIMESTAMPTZ | |

### golf_scores
- Rolling window of 5 per user enforced by PostgreSQL trigger
- Score range: 1–45 (Stableford)
- Ordered by played_on DESC

### draws
| Column | Type | Notes |
|---|---|---|
| month | INT | 1–12 |
| year | INT | |
| status | ENUM | pending / simulated / published |
| logic | ENUM | random / algorithmic |
| drawn_numbers | INT[] | 5 numbers |
| jackpot_pool | NUMERIC | rolls over if unclaimed |
| five_match_won | BOOLEAN | tracks jackpot rollover |

### draw_entries
- Created when draw is published
- Snapshot of user's 5 scores at draw time
- match_type: five_match / four_match / three_match / null

### winner_verifications
- Created for winners on draw publish
- States: pending → (paid | rejected)
- Admin reviews proof_url screenshot

---

## Key Flows

### Subscription Flow
```
User selects plan + charity
  → POST /api/subscriptions/create-checkout
  → Stripe Checkout Session created
  → User completes payment on Stripe
  → Stripe webhook: checkout.session.completed
  → Subscription row inserted in DB
  → User redirected to /dashboard?subscription=success
```

### Draw Flow
```
Admin creates draw (POST /api/admin/draws)
  → Status: pending

Admin simulates (POST /api/admin/draws/:id/simulate)
  → Draw engine generates 5 numbers
  → Matches all active subscriber scores
  → Shows preview — does NOT save entries
  → Status: simulated

Admin publishes (POST /api/admin/draws/:id/publish)
  → Numbers finalised and saved
  → draw_entries created for all qualifying subscribers
  → winner_verifications created for winners
  → Jackpot rolls over if no 5-match winner
  → Status: published
```

### Score Rolling Window
```
User adds 6th score
  → PostgreSQL trigger fires after INSERT
  → Deletes scores beyond newest 5 (ordered by played_on DESC)
  → Always keeps exactly 5 most recent
```

---

## Prize Pool Calculation

```
Active subscribers: N
Average subscription amount: £9.99/month
Pool contribution rate: 50%

Total pool = N × £9.99 × 50%

Distribution:
  Jackpot (5-match):   40% of pool
  4-match prize:       35% of pool
  3-match prize:       25% of pool

Split among multiple winners in same tier.
Jackpot rolls over if no 5-match winner.
```

---

## Security

- All routes protected by JWT middleware
- Admin routes additionally check role === 'admin'
- Stripe webhook validates signature (HMAC-SHA256)
- Supabase RLS enabled on sensitive tables
- Input validation via express-validator on all POST/PUT routes
- Rate limiting: 100 req / 15 min per IP
- Helmet.js sets security headers
- CORS restricted to frontend URL
- Passwords: bcrypt cost factor 10

---

## Scalability Decisions

1. **Supabase** — serverless Postgres scales horizontally; RLS handles multi-tenant isolation
2. **Stripe** — handles all payment complexity, PCI compliance, retries
3. **Stateless JWT** — no session storage needed; scales across multiple backend instances
4. **Draw entries as snapshots** — score snapshot at draw time = immutable audit trail
5. **Prize pool config table** — admin-configurable percentages without code deploys
6. **Modular route structure** — easy to split into microservices as needed

### Future Expansion Hooks
- `prize_pool_config` table ready for per-region pricing
- Corporate/team accounts: add `team_id` FK to subscriptions
- Campaign module: add `campaigns` table linked to charities
- Mobile app: REST API is already mobile-ready (stateless JWT)
- Multi-currency: Stripe supports 135+ currencies; add `currency` column to subscriptions
