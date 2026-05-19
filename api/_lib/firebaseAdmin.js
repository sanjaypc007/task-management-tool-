/**
 * Firebase Admin initialization (server-side only).
 *
 * Reads credentials from env vars and exports admin SDK helpers.
 *
 * Supported env configurations:
 * 1) FIREBASE_SERVICE_ACCOUNT_KEY = JSON string of the service account
 * 2) FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 */

import admin from "firebase-admin";

const getServiceAccountFromEnv = () => {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY. It must be valid JSON (service account)."
      );
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, "\n") : "";

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_ADMIN_PROJECT_ID/FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  return { projectId, clientEmail, privateKey };
};

const ensureAdminInitialized = () => {
  if (admin.apps.length) return;

  const serviceAccount = getServiceAccountFromEnv();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

ensureAdminInitialized();

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminFieldValue = admin.firestore.FieldValue;
