# Testing Checklist — Golf Charity Subscription Platform

Use this checklist to verify all features are working correctly.

---

## 🔐 Authentication

- [ ] User can sign up with valid email/password
- [ ] Password strength indicator shows during signup
- [ ] Weak password is rejected (< 8 chars, missing uppercase/number/symbol)
- [ ] Duplicate email shows appropriate error
- [ ] User can log in with correct credentials
- [ ] Wrong password shows "Invalid credentials" (no email enumeration)
- [ ] JWT token persists across page refresh (localStorage)
- [ ] Session expiry redirects to /login?session=expired
- [ ] Logout clears token and redirects to homepage

---

## 💳 Subscription Flow

- [ ] Non-subscriber redirected to /subscribe when accessing restricted features
- [ ] Plan selection: monthly (£9.99) and yearly (£99.99) shown
- [ ] Yearly plan shows "Best Value" and savings amount
- [ ] Charity list loads with search and featured section
- [ ] Charity percentage slider: min 10%, max 100%, step 5%
- [ ] Confirmation screen shows correct plan, charity, and calculated amounts
- [ ] Stripe Checkout opens on payment button click
- [ ] Successful payment creates subscription (Stripe webhook)
- [ ] User redirected to /dashboard?subscription=success with toast
- [ ] Cancelled checkout shows toast and returns to /subscribe
- [ ] Already-subscribed user cannot create duplicate subscription

---

## ⛳ Score Management

- [ ] Score entry form validates range 1–45 (Stableford)
- [ ] Score entry requires a valid date (no future dates)
- [ ] Scores display in reverse chronological order (newest first)
- [ ] Adding 6th score automatically removes oldest (rolling window)
- [ ] Maximum 5 scores enforced (enforced at DB level via trigger)
- [ ] Score can be edited inline
- [ ] Score can be deleted with confirmation prompt
- [ ] Score entry unavailable without active subscription

---

## 🎲 Draw System

- [ ] Draws page shows all published draws
- [ ] Each draw shows: month/year, drawn numbers, prize pools, my entry
- [ ] Matched numbers highlighted in gold
- [ ] Draw entries show user's scores and matched count
- [ ] Prize amounts displayed for winning entries

---

## 🏆 Dashboard

- [ ] Stat cards show: scores logged, draws entered, total won, charity given
- [ ] Subscription info: plan, status, renewal date, charity name, %
- [ ] Upcoming draw displayed if one exists (pending status)
- [ ] Scores tab opens full score manager
- [ ] Draw History tab shows all past entries
- [ ] Winnings tab shows total + individual verification statuses

---

## ❤️ Charities

- [ ] Charity listing page accessible without login
- [ ] Featured charities shown at top with star label
- [ ] Search filters charities by name
- [ ] Clicking charity card expands description + events
- [ ] Upcoming events shown by date

---

## 👑 Admin Panel

### Dashboard
- [ ] Stats cards show: total users, active subscribers, prize pool, charity raised, pending verifications, paid out, total draws, jackpot

### Users
- [ ] User table with pagination
- [ ] Search by email works
- [ ] Edit modal allows updating: name, email, role
- [ ] Role change between subscriber/admin

### Draw Management
- [ ] Create new draw with month, year, logic type
- [ ] Duplicate month/year shows error
- [ ] Simulate draw shows preview (numbers + winner counts)
- [ ] Publish draw saves entries + creates winner verifications
- [ ] Published draws cannot be edited
- [ ] Draw logic: random and algorithmic both work

### Charity Management
- [ ] Add new charity form
- [ ] Edit existing charity (name, description, URL, featured)
- [ ] Toggle featured status
- [ ] Deactivate charity (soft delete)

### Winner Verifications
- [ ] Filter by: pending / paid / rejected
- [ ] Each entry shows: user, draw, match type, prize amount
- [ ] Proof URL clickable if uploaded
- [ ] Warning shown if no proof uploaded
- [ ] "Mark Paid" updates status + records timestamp
- [ ] "Reject" with default admin note

### Subscriptions
- [ ] Full list with: user, plan, status, amount, charity, %

---

## 📱 Responsive Design

- [ ] Homepage hero legible on mobile
- [ ] Navbar collapses to hamburger on mobile
- [ ] Dashboard cards stack vertically on mobile
- [ ] Score manager usable on mobile
- [ ] Admin sidebar hidden on mobile (or accessible)
- [ ] Tables scroll horizontally on small screens

---

## 🔒 Security & Edge Cases

- [ ] Direct access to /admin without admin role redirects to /dashboard
- [ ] Direct access to /dashboard without login redirects to /login
- [ ] API returns 401 for unauthenticated requests
- [ ] API returns 403 for non-admin on admin routes
- [ ] Score outside 1–45 range rejected by API
- [ ] Stripe webhook validates signature (tampered request rejected)
- [ ] Rate limiting active (100 req/15 min)

---

## ⚡ Performance

- [ ] Homepage loads in < 3s on mobile (Lighthouse)
- [ ] No unhandled promise rejections in console
- [ ] API errors shown via toast notifications
- [ ] Loading spinners shown during API calls
- [ ] Empty states shown (no scores, no draws, etc.)
