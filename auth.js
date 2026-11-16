import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import "dotenv/config";

// 1. Establish the shared MongoDB Connection (serverless-safe)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Missing required environment variable: MONGODB_URI. Set it in .env for local development or in your Vercel project settings for production."
  );
}

export const client = new MongoClient(MONGODB_URI);
export const db = client.db("SpaceCraft-database");

// Cache the connection promise globally so concurrent serverless cold-start
// requests share a single connection attempt instead of racing each other.
export async function connectDB() {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = client
      .connect()
      .then((connectedClient) => {
        console.log("You successfully connected to MongoDB!");
        return connectedClient;
      })
      .catch((err) => {
        // Do not cache a rejected promise — let the next request retry.
        global._mongoClientPromise = undefined;
        throw err;
      });
  }
  return global._mongoClientPromise;
}

// Safe fallback chain: FRONTEND_URL > CLIENT_URL > local dev URL, with any
// accidental trailing slash stripped so origins compare exactly.
const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

// 2. Initialize BetterAuth
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // Ensures registration navigates cleanly to /login without auto-logging in
  },
  // 3. Google Social Provider (OAuth 2.0)
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowUnverifiedEmails: true,
    },
  },
  onAPIError: {
    errorURL: `${FRONTEND_URL}/login`,
  },
  trustedOrigins: [FRONTEND_URL, "http://localhost:3000"],
});