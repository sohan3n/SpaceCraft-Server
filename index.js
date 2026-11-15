import express from "express";
import cors from "cors";
import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import { auth, client } from "./auth.js";
import usersRouter from "./routes/users.js";
import studiosRouter from "./routes/studios.js";
import bookingsRouter from "./routes/bookings.js";

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Crucial CORS Update for Authentication Cookies
app.use(
  cors({
    origin: [process.env.CLIENT_URL], // Must exactly match your Next.js URL
    credentials: true, // Required for secure cross-origin cookies
  })
);
app.use(express.json());

// 2. Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB();

// 3. Mount BetterAuth API Routes
app.use("/api/auth", toNodeHandler(auth));

// 4. Protected API Routes (session-verified)
app.use("/api/users", usersRouter);

app.use("/api/studios", studiosRouter);

app.use("/api/bookings", bookingsRouter);

app.get("/", (req, res) => {
  res.send({ message: "Server is running perfectly!" });
});

app.listen(PORT, () => {
  console.log(`Example app listening on PORT ${PORT}`);
});