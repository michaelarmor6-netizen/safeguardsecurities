# Firebase Deployment Instructions

## Deploy Firestore Rules

To fix the client login issue, you need to deploy the new Firestore security rules:

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase in your project** (if not already done):
```bash
firebase init firestore
```
Select your existing project: `e-bank-dashboard`

4. **Deploy the new rules**:
```bash
firebase deploy --only firestore:rules
```

## Alternative: Temporary Quick Fix

If you can't deploy rules immediately, you can temporarily use this rule for testing:

**Go to Firebase Console → Firestore Database → Rules and replace with:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary permissive rules for testing - REPLACE IN PRODUCTION
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ WARNING: The above rule allows full access to your database. Only use for testing and replace immediately with the secure rules in firestore.rules file.**

## Secure Production Rules

The `firestore.rules` file in your project contains secure, production-ready rules that:
- Allow username lookups for login
- Protect sensitive user data
- Ensure proper admin/client permissions
- Follow banking security standards

Deploy these rules for production use.