# 💰 WealthWise

A full-stack personal finance tracker built for Singapore. Track income and expenses across multiple bank accounts, monitor your stock portfolio with live prices, and watch your net worth grow over time — all in SGD.

---

## Features

### Dashboard
- Live **Net Worth** = cumulative cash balance + live portfolio value
- **Net Worth trend chart** over the last 6 months, auto-filled as you use the app
- Spending breakdown by category (donut chart)
- Recent transactions and portfolio holdings at a glance
- **Auto-snapshot**: on your first visit each month the previous month's portfolio value is silently recorded so your history fills in automatically

### Money Flow
- Track **income and expenses** together in one place
- Add multiple **bank accounts** (DBS, OCBC, cash, credit cards, etc.)
- Per-account **P&L breakdown** — income, expenses and net per account per month
- Filter transactions by month, account, and type
- Income vs Expenses bar chart over the last 6 months
- Monthly summary strip with clickable navigation

### Portfolio
- Add stock and ETF holdings by ticker symbol (SGX `.SI` and US markets supported)
- **Live prices** via Finnhub API
- Holdings table with current price, market value, unrealized P&L and day change
- **Portfolio performance chart** — last 6 months, current month always live
- Portfolio allocation bar showing weight per holding

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts, Zustand |
| Backend | Node.js 22, Express 4 |
| Database & Auth | Firebase Firestore + Firebase Authentication |
| Stock Prices | Finnhub API (free tier) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
wealthwise/
├── firebase.rules
├── frontend/                        # → deployed to Vercel
│   └── src/
│       ├── components/
│       │   ├── dashboard/           # DashboardPage
│       │   ├── moneyflow/           # MoneyFlowPage, TransactionForm, AccountForm
│       │   ├── networth/            # NetWorthPage (Portfolio), InvestmentForm
│       │   └── shared/              # Layout, AuthPage, Modal, EmptyState
│       ├── services/
│       │   ├── api.js               # Axios with Firebase token injection
│       │   └── firebase.js          # Firebase client SDK
│       ├── store/
│       │   ├── authStore.js         # Firebase Auth state
│       │   ├── expenseStore.js      # Transactions + accounts
│       │   └── investmentStore.js   # Holdings, quotes, snapshots, auto-snapshot
│       └── utils/
│           └── formatters.js        # SGD formatter, chart builders, category lists
└── backend/                         # → deployed to Render
    └── src/
        ├── config/firebase.js       # Firebase Admin SDK
        ├── middleware/
        │   ├── auth.js              # Token verification
        │   └── errorHandler.js      # Centralised error handler
        ├── routes/                  # expenses.js, investments.js, networth.js
        ├── controllers/             # Request handlers
        └── services/
            ├── expenseService.js    # Transactions + accounts CRUD, monthly summary
            ├── investmentService.js # Holdings CRUD, Finnhub quotes, ticker search
            └── networthService.js   # Net worth + snapshot history
```

---

## API Reference

All endpoints require `Authorization: Bearer <firebase_id_token>`.

### Transactions — `/api/expenses`

| Method | Path | Description |
|---|---|---|
| GET | `/api/expenses` | List transactions. Query: `?month=YYYY-MM` `?accountId=` `?type=income\|expense` |
| POST | `/api/expenses` | Create. Body: `{ date, detail, type, category, amount, accountId }` |
| PUT | `/api/expenses/:id` | Update |
| DELETE | `/api/expenses/:id` | Delete |
| GET | `/api/expenses/summary` | Monthly summary (12 months) with per-account P&L |

### Accounts — `/api/expenses/accounts`

| Method | Path | Description |
|---|---|---|
| GET | `/api/expenses/accounts` | List accounts |
| POST | `/api/expenses/accounts` | Create. Body: `{ name, type: bank\|savings\|cash\|credit }` |
| PUT | `/api/expenses/accounts/:id` | Update |
| DELETE | `/api/expenses/accounts/:id` | Delete |

### Investments — `/api/investments`

| Method | Path | Description |
|---|---|---|
| GET | `/api/investments` | List holdings |
| POST | `/api/investments` | Add. Body: `{ ticker, shares, avgCost, name? }` |
| PUT | `/api/investments/:id` | Update |
| DELETE | `/api/investments/:id` | Remove |
| GET | `/api/investments/quotes` | Live prices for all holdings via Finnhub |
| GET | `/api/investments/search?q=` | Ticker autocomplete (5 results) |

### Net Worth — `/api/networth`

| Method | Path | Description |
|---|---|---|
| GET | `/api/networth` | Current net worth breakdown |
| GET | `/api/networth/history` | All saved monthly snapshots |
| POST | `/api/networth/snapshot` | Save snapshot. Body: `{ month: YYYY-MM, cash, investmentsValue }` |

---

## Firestore Data Model

All data lives under `users/{uid}/` — each user can only read and write their own data (enforced by security rules).

```
users/{uid}/
  accounts/{accountId}
    name:       string
    type:       "bank" | "savings" | "cash" | "credit"
    currency:   "SGD"
    createdAt:  timestamp

  transactions/{txId}
    detail:     string
    category:   string
    type:       "income" | "expense"
    amount:     number
    date:       timestamp
    accountId:  string | null
    createdAt:  timestamp

  investments/{investmentId}
    ticker:     string       e.g. "AAPL", "D05.SI"
    name:       string
    shares:     number
    avgCost:    number
    addedAt:    timestamp

  netWorthSnapshots/{YYYY-MM}
    month:            string
    cash:             number
    investmentsValue: number
    totalNetWorth:    number
    createdAt:        timestamp
```

---

## Environment Variables

### `backend/.env`

```env
PORT=4000
NODE_ENV=development

# Firebase Admin — Firebase Console → Project Settings → Service Accounts → Generate key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# Finnhub — finnhub.io (free, no credit card needed)
FINNHUB_API_KEY=your_finnhub_key

# CORS — comma-separated
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

### `frontend/.env`

```env
# Firebase Web App — Firebase Console → Project Settings → Your Apps → Web App
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Backend URL
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## Local Development

**Requires Node.js 22 LTS** — earlier versions cause Finnhub to fail with `getSetCookie is not a function`.

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # fill in keys
npm install
npm run dev            # http://localhost:4000

# Terminal 2 — frontend
cd frontend
cp .env.example .env   # fill in keys
npm install
npm run dev            # http://localhost:5173
```

Publish `firebase.rules` in the Firebase Console under Firestore → Rules before running.

---

## Deployment

### Backend → Render

1. Push repo to GitHub (private)
2. Render → New → Web Service → connect repo
3. Root Directory: `backend` · Build: `npm install` · Start: `npm start`
4. Environment variables: all from `backend/.env` plus `NODE_VERSION=22`
5. Deploy → copy the `https://your-app.onrender.com` URL

### Frontend → Vercel

1. Vercel → New Project → import repo
2. Root Directory: `frontend`
3. Add all `frontend/.env` variables; set `VITE_API_BASE_URL` to your Render URL + `/api`
4. Deploy

### Final wiring

- Render: update `ALLOWED_ORIGINS` to include your Vercel URL
- Firebase Console → Authentication → Settings → Authorised domains → add your Vercel domain

---

## Notes

**Currency** — All amounts display in SGD. Stock prices come back in the exchange's native currency (USD for NYSE/NASDAQ, SGD for SGX). Use `.SI` suffix for SGX stocks: `D05.SI` (DBS), `ES3.SI` (STI ETF), `C31.SI` (CapitaLand).

**Auto-snapshots** — WealthWise silently saves a portfolio snapshot for the previous month on your first dashboard visit each month. This is what fills in the net worth history chart over time. No action needed.

**Render cold starts** — Free tier sleeps after 15 minutes idle. First request takes ~30 seconds. The API timeout is set to 35 seconds to handle this. Upgrade to Render Starter ($7/mo) to eliminate cold starts.

**Finnhub rate limits** — Free tier: 60 calls/min. Quotes are fetched sequentially with a 120ms gap between tickers. If you have many holdings a full refresh takes a few extra seconds — this is normal.
