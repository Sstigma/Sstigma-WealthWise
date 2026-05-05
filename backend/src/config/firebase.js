const admin = require("firebase-admin");

let app;

/**
 * Initialise Firebase Admin SDK (singleton).
 * Credentials are read from environment variables so no JSON file is needed
 * in the repository — safe for public repos.
 */
function initFirebase() {
  if (app) return app;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
    process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error(
      "Missing Firebase env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });

  return app;
}

function getFirestore() {
  initFirebase();
  return admin.firestore();
}

function getAuth() {
  initFirebase();
  return admin.auth();
}

module.exports = { initFirebase, getFirestore, getAuth };
