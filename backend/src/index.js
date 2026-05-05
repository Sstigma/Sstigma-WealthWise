require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

const { initFirebase } = require("./config/firebase");
const { errorHandler } = require("./middleware/errorHandler");

const expensesRouter = require("./routes/expenses");
const investmentsRouter = require("./routes/investments");
const networthRouter = require("./routes/networth");

// Initialise Firebase Admin before any request is handled
initFirebase();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ─────────────────────────────────────────────────────────────────
// Enable 'trust proxy'
app.set("trust proxy", 1);

// CORS headers - allow only our frontend domain and handle preflight requests
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://sstigma-wealth-wise.vercel.app",
  );
  res.header("Access-Control-Allow-Private-Network", "true"); // This is the key!
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight (OPTIONS) requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(limiter);

// ── General middleware ────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/expenses", expensesRouter);
app.use("/api/investments", investmentsRouter);
app.use("/api/networth", networthRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Centralised error handler ─────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `🚀 WealthWise API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
  );
});

module.exports = app;
