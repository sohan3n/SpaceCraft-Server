import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import "dotenv/config";

// 1. Establish the shared MongoDB Connection
export const client = new MongoClient(process.env.MONGODB_URI);
export const db = client.db("SpaceCraft-database");

// 2. Initialize BetterAuth
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true, // Enables standard email/password registration and login
  },
  // 3. Google Social Provider (OAuth 2.0)
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins: ["http://localhost:3000"],
});
