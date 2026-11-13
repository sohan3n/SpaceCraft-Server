import express from "express";
import cors from "cors";
import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import { auth, client } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Crucial CORS Update for Authentication Cookies
app.use(
  cors({
    origin: "http://localhost:3000", // Must exactly match your Next.js URL
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

app.get("/", (req, res) => {
  res.send({ message: "Server is running perfectly!" });
});

app.listen(PORT, () => {
  console.log(`Example app listening on PORT ${PORT}`);
});