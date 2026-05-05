# WealthWise 💰

A full-stack personal finance tracker with expense management and net worth dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts |
| Backend | Node.js, Express, Yahoo Finance Library |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Deployment | Vercel (frontend), Render (backend) |

## Project Structure

wealthwise/
├── frontend/          # React app → deploy to Vercel
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── expenses/
│   │   │   ├── networth/
│   │   │   └── shared/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   └── ...
└── backend/           # Express API → deploy to Render
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── services/
    │   ├── middleware/
    │   └── config/
    └── ...
```

## How to run on local

### Prerequisites
- Node.js 18+
- Firebase project with Firestore + Auth enabled
- A Yahoo Finance-compatible environment (backend handles this)

### 1. Clone and install

```bash
git clone <your-repo>
cd wealthwise

# Install frontend deps
cd frontend && npm install

# Install backend deps
cd ../backend && npm install
```

### 2. Configure environment variables

**frontend/.env**
```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:4000/api
```

**backend/.env**
```
PORT=4000
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"
ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-app.vercel.app
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in production mode
5. Add Firestore security rules (see `firebase.rules`)
6. Generate a **Service Account** key for the backend (Project Settings → Service Accounts)

### 4. Run locally

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Push to GitHub and connect repo to Vercel
# Set environment variables in Vercel dashboard
```

### Backend → Render

1. Push backend to GitHub
2. Create a new **Web Service** on Render
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `backend/.env`

## Firestore Collections

```
users/{uid}/
  expenses/{expenseId}
    - date: timestamp
    - detail: string
    - category: string
    - amount: number
    - createdAt: timestamp

  investments/{investmentId}
    - ticker: string
    - shares: number
    - avgCost: number
    - addedAt: timestamp

  netWorthSnapshots/{snapshotId}
    - month: string (YYYY-MM)
    - cash: number
    - investmentsValue: number
    - totalNetWorth: number
    - createdAt: timestamp
```

## API Endpoints

### Expenses
- `GET    /api/expenses` — list expenses (supports `?month=YYYY-MM`)
- `POST   /api/expenses` — create expense
- `PUT    /api/expenses/:id` — update expense
- `DELETE /api/expenses/:id` — delete expense
- `GET    /api/expenses/summary` — monthly summary

### Investments
- `GET    /api/investments` — list investments
- `POST   /api/investments` — add investment
- `PUT    /api/investments/:id` — update investment
- `DELETE /api/investments/:id` — remove investment
- `GET    /api/investments/quotes` — fetch live quotes from Yahoo Finance

### Net Worth
- `GET    /api/networth` — current net worth breakdown
- `GET    /api/networth/history` — monthly history snapshots
- `POST   /api/networth/snapshot` — save monthly snapshot
