# 🔥 Firebase Setup Guide

## Quick Setup Steps

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Create a project"
3. Name it "bank-dashboard" (or any name you prefer)
4. Enable/disable Google Analytics as desired
5. Click "Create project"

### 2. Enable Authentication
1. In your project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click "Email/Password"
5. Enable the first toggle (Email/Password)
6. Click "Save"

### 3. Create Firestore Database
1. Click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select your preferred location
5. Click "Done"

### 4. Get Your Config
1. Click the gear icon ⚙️ (Project settings)
2. Scroll down to "Your apps" section
3. Click the web icon `</>`
4. Register app name: "Bank Dashboard"
5. Copy the firebaseConfig object

### 5. Example Config
Your Firebase config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Copy this
  authDomain: "your-project.firebaseapp.com", // Copy this
  projectId: "your-project-id", // Copy this
  storageBucket: "your-project.appspot.com", // Copy this
  messagingSenderId: "123456789", // Copy this
  appId: "1:123:web:abc123", // Copy this
  measurementId: "G-ABCDEFGHIJ" // Copy this (if Analytics enabled)
};
```

### 6. Update .env File
Replace the values in your `.env` file:
```env
VITE_FIREBASE_API_KEY=AIzaSyC... (your actual API key)
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEFGHIJ
```

### 7. Restart Development Server
After updating .env:
```bash
npm run dev
```

## ✅ Verification
1. Go to http://localhost:5173/signup
2. Try creating an account
3. Check Firebase Console > Authentication > Users to see if user was created

## 🔒 Security Notes
- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use different Firebase projects for development and production

## 🆘 Troubleshooting
- If you see "api-key-not-valid" → Double-check your API key
- If you see "project-not-found" → Verify your project ID
- If you see "auth/operation-not-allowed" → Enable Email/Password in Firebase Console

## 📞 Need Help?
If you encounter issues:
1. Double-check each step above
2. Verify your Firebase project settings
3. Check the browser console for specific error messages
4. Ensure your .env values exactly match your Firebase config