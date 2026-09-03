# Viraloft — Fixes & Enhancements Summary

## 1. Why the dashboard was broken (root causes)

1. **`backend/utils/apiClient.js` crashed the entire server on startup.**
   It threw an error at *module load time* if `SMM_API_URL` / `SMM_API_KEY`
   weren't set in `.env`. Since this file is required by the orders and
   services routes, which are required by `server.js`, the whole backend
   died on boot — meaning login, dashboard, admin, everything was down,
   not just ordering. **Fixed:** it now only errors when a vendor-dependent
   endpoint is actually called, with a clear 503 message, and logs a
   warning instead of crashing.
2. **`routes/users.js` and `routes/staff.js` were never mounted** in
   `server.js`. Profile preferences and staff order/ticket views were
   silently 404ing. **Fixed:** all routes are now mounted.
3. No `.env.example` existed, so it wasn't obvious what config was
   required. **Added:** `backend/.env.example` with every variable
   documented.

Once you copy `backend/.env.example` to `backend/.env` and fill in
`MONGO_URI` and `JWT_SECRET` (the only two *required* values — everything
else has safe fallbacks), the server boots and the dashboard works.

## 2. Backend security hardening

- **Login brute-force protection**: 5 failed attempts locks the account
  for 15 minutes. Failed/locked attempts don't reveal whether the email
  exists (prevents user enumeration).
- **Account status enforcement**: new `active | suspended | banned` status
  on every user. Suspended/banned users are blocked at both login *and*
  on every authenticated request (even with a still-valid token).
- **Stricter CORS**: production reads an explicit allow-list from
  `CORS_ORIGIN` instead of reflecting any origin.
- **Content-Security-Policy** headers added via Helmet (previously only
  default headers were set).
- **Password strength check** on registration/change-password (min 8
  chars, letter + number).
- **Dedicated rate limiter on auth routes** (register/login/verify/resend)
  on top of the global API limiter, to slow down credential stuffing.
- **Centralized error handler** — no more unhandled stack traces leaking
  to clients; consistent JSON error shape.
- **Fail-fast startup** — missing `MONGO_URI`/`JWT_SECRET` now stops the
  server with a clear message instead of failing on the first request.
- **Full audit trail** (new `AuditLog` model): every balance change, role
  change, account status change, staff account creation, and order status
  override by an admin/staff member is logged with who/what/when.
- **Balance changes are no longer silent overwrites.** A new `Transaction`
  model records every credit/debit with a reason, before/after balance,
  and who performed it — visible in the admin panel per-user.
- **Privilege separation fixed**: previously staff had the same
  `PUT /api/admin/users/:id` access as admins (could change anyone's
  balance or role). Now balance/role/status changes and staff-account
  creation are admin-only; staff get read-only account visibility.

## 3. New/expanded backend endpoints

| Method & Path | Access | Purpose |
|---|---|---|
| `GET /api/admin/users/:id/detail` | admin, staff (read) | Full account view: profile, recent orders, tickets, transactions, spend summary |
| `POST /api/admin/users/:id/balance` | admin only | Credit/debit balance with reason, logged as a `Transaction` + audit entry |
| `PUT /api/admin/users/:id/status` | admin only | Suspend / ban / reactivate an account |
| `POST /api/admin/staff` | admin only | Create a new staff or admin account directly |
| `GET /api/admin/audit-logs` | admin only | View the sensitive-action audit trail |
| `GET /api/users/search?q=` | admin, staff | Look up a user by name/email/ID (used by Support + Staff panel) |
| `POST /api/staff/messages` | admin, staff | Proactively message a user (opens a ticket on their behalf) |

## 4. Frontend — modern Admin & Staff panels

Both dashboards were rebuilt with a clean sidebar + topbar admin-tool layout
(shared `AdminShell` component), replacing the old plain/dated pages:

- **Admin Dashboard** (`/admin`): Overview (stats + revenue), Users (search,
  view full account detail, credit/debit balance, change role, suspend/ban),
  Orders (search/filter/paginate, status actions), Staff accounts (create
  staff/admin logins), Audit log.
- **Staff Dashboard** (`/staff`): Orders queue with status actions, and a
  "Look up user" tab with **read-only** account detail (staff can see
  everything to help a user — orders, tickets, balance history — but can't
  edit balance/role/status; that stays admin-only for security).
- **User account detail modal** is shared between both panels (`canManage`
  prop toggles the edit controls) so admin and staff see identical account
  data, just with different permissions.
- Both link directly into the existing **Support ticket inbox**
  (`/support`), which already had solid staff/admin ticket management
  (assign, priority, status, filters) — I fixed it to use the shared,
  properly-configured API client instead of raw `axios` (which could break
  in production if the frontend and backend are on different domains), and
  wired up the "message a user directly" feature to the new backend
  endpoint so it actually works now.

## 5. What to do before deploying

1. `cd backend && cp .env.example .env` and fill in `MONGO_URI`, `JWT_SECRET`,
   and (when ready) `SMM_API_URL` / `SMM_API_KEY` and SMTP creds.
2. `npm install` in both `backend/` and `frontend/`.
3. Set `CORS_ORIGIN` in production to your real frontend domain(s).
4. `npm run build` in `frontend/` — `backend/server.js` will serve the
   built SPA automatically when `NODE_ENV=production`.
5. The first admin account has to be created directly in MongoDB (set
   `role: "admin"` on a user document) — after that, use the "Create staff
   / admin account" button in the Admin panel for everyone else.

## 6. Verified

- All backend files pass `node --check` and load without throwing.
- Server boots cleanly end-to-end with a test Mongo URI + JWT secret,
  including with no vendor API keys set (previously fatal).
- `npm run build` on the frontend completes with no errors.
