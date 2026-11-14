import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Protected route: verifies the BetterAuth session cookie and returns the user
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
