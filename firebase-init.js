(function () {
  window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
    apiKey: "AIzaSyCbAQrQEyETkBw_1nMlDwEnkn4jqt1uPpo",
    authDomain: "e-bank-dashboard.firebaseapp.com",
    projectId: "e-bank-dashboard",
    storageBucket: "e-bank-dashboard.firebasestorage.app",
    messagingSenderId: "186587489295",
    appId: "1:186587489295:web:c63b39b5216981bf89ef7a"
  };

  // Same named database as the live React client app.
  window.FIRESTORE_DATABASE_ID = "safeguardsecurities";

  if (!window.firebase) {
    console.error("Firebase SDK is not loaded.");
    return;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(window.FIREBASE_CONFIG);
  }

  window.firebaseAuth = window.firebase.auth();

  try {
    window.firebaseDb = window.firebase.firestore(
      window.firebase.app(),
      window.FIRESTORE_DATABASE_ID
    );
  } catch (err) {
    console.error("Firestore init failed:", err);
    window.firebaseDb = window.firebase.firestore();
  }

  try {
    if (typeof window.firebase.analytics === "function") {
      window.firebaseAnalytics = window.firebase.analytics();
    }
  } catch (err) {
    console.warn("Firebase Analytics is not available in this environment.");
  }
})();
