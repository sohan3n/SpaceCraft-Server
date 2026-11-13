import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import "dotenv/config";

// 1. Establish the shared MongoDB Connection
export const client = new MongoClient(process.env.MONGODB_URI);
export const db = client.db();

// 2. Initialize BetterAuth
export const auth = betterAuth({
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true, // Enables standard email/password registration and login
  },
});