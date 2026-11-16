import express from "express";
import cors from "cors";
import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import { auth, connectDB } from "./auth.js";
import usersRouter from "./routes/users.js";
import studiosRouter from "./routes/studios.js";
import bookingsRouter from "./routes/bookings.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Vercel serves Express behind a reverse proxy. Trust it so Express and
// BetterAuth correctly detect HTTPS and secure cookies in production.
app.set("trust proxy", 1);

// 1. Crucial CORS Update for Authentication Cookies
// Strip any accidental trailing slash from CLIENT_URL and always allow the
// local development origin so `npm run dev` keeps working.
const allowedOrigins = [
  process.env.CLIENT_URL?.replace(/\/$/, ""),
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins, // Must exactly match your Next.js URL
    credentials: true, // Required for secure cross-origin cookies
  })
);
app.use(express.json());

// 2. Serverless-safe MongoDB connection middleware.
// The connection promise is cached globally (see connectDB in auth.js), so a
// cold start never runs a route handler before the database is ready.
const dbReady = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    res.status(500).json({
      success: false,
      message: "Database connection failed. Please try again.",
    });
  }
};

// 3. Mount BetterAuth API Routes (its adapter shares the same cached client)
app.use("/api/auth", dbReady, toNodeHandler(auth));

// Await the shared connection before any DB-backed API route runs
app.use("/api", dbReady);

// 4. Protected API Routes (session-verified)
app.use("/api/users", usersRouter);

app.use("/api/studios", studiosRouter);

app.use("/api/bookings", bookingsRouter);

// Health check — opening the live Vercel URL confirms the API is healthy
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SpaceCraft API is running",
  });
});

// Only bind a port locally. On Vercel, the serverless runtime invokes the
// exported `app` directly instead of calling listen().
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
