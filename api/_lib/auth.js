/**
 * Auth helper: verifies Firebase ID tokens and returns the authenticated UID.
 */

import { adminAuth } from "./firebaseAdmin";

export const requireAuthUid = async (req) => {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = typeof header === "string" ? header.match(/^Bearer\s+(.+)$/i) : null;
  const token = match ? match[1] : "";

  if (!token) {
    const error = new Error("Missing Authorization header (Bearer token).");
    error.statusCode = 401;
    throw error;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    const error = new Error("Invalid or expired Firebase ID token.");
    error.statusCode = 401;
    throw error;
  }
};
