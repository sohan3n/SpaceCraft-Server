import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";

// Phase 1 backend session verification middleware
export async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in to continue.",
      });
    }

    req.user = session.user;
    req.session = session.session;

    return next();
  } catch (err) {
    console.error("Session verification failed:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while verifying your session.",
    });
  }
}

export default requireAuth;
