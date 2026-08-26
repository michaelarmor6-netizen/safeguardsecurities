# Firestore Database Setup Guide

## Issue
The application is showing Firestore connection errors with 400 status codes. This typically indicates that the Firestore database is not properly initialized in your Firebase project.

## Solution Steps

### 1. Initialize Firestore Database
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `e-bank-dashboard`
3. In the left sidebar, click on **"Firestore Database"**
4. If you see a "Create database" button, click it
5. Choose **"Start in test mode"** for now (we'll add security rules later)
6. Select a location for your database (choose one close to your users)
7. Click **"Done"**

### 2. Verify Database Creation
After creating the database, you should see:
- A Firestore console with collections
- The database URL should be: `projects/e-bank-dashboard/databases/(default)`

### 3. Set Up Security Rules (Temporary)
In the Firestore console:
1. Go to the **"Rules"** tab
2. Replace the default rules with these temporary rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write test documents (for debugging)
    match /test/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Temporary: Allow all authenticated users to read/write (CHANGE THIS LATER)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

### 4. Test the Connection
After setting up Firestore:
1. Refresh your application at http://localhost:5173/
2. Check the Firebase Debugger widget (top-right corner)
3. Try to sign in with your account
4. Check the browser console for any remaining errors

### 5. If Still Having Issues
If you continue to see 400 errors:
1. Make sure your Firebase project billing is enabled (Firestore requires Blaze plan for production)
2. Check that your API keys have the correct permissions
3. Verify the project ID matches exactly: `e-bank-dashboard`

## Security Notes
The rules above are for testing only. In production, you should implement proper security rules that:
- Validate user permissions
- Restrict access to specific collections
- Prevent unauthorized data access

## Next Steps
Once Firestore is working:
1. The authentication routing should work properly
2. User data will be stored in Firestore
3. All dashboard features will be functional