# Firebase Configuration Fix Guide

## Firebase Storage CORS Fix Guide

## Current Status
✅ **System Settings save functionality working**
✅ **Logo upload code implemented**  
✅ **File validation added** (5MB limit, image types only)
⚠️ **Logo upload blocked by CORS policy**

## Quick Fix - Run Automated Script

### Option 1: PowerShell (Windows)
```powershell
.\fix-firebase-cors.ps1
```

### Option 2: Batch File (Windows) 
```cmd
fix-firebase-cors.bat
```

## Manual Fix Steps

### Step 1: Install Google Cloud SDK
1. Download: https://cloud.google.com/sdk/docs/install
2. Install and restart your terminal
3. Run: `gcloud auth login`

### Step 2: Apply CORS Configuration
```bash
gsutil cors set firebase-storage-cors.json gs://e-bank-dashboard.firebasestorage.app
```

### Step 3: Verify Configuration
```bash
gsutil cors get gs://e-bank-dashboard.firebasestorage.app
```

### Option 2: Update Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `e-bank-dashboard`
3. Navigate to Storage > Rules
4. Replace rules with content from `firebase-storage-rules.txt`

### Option 3: Enable Public Read (Quick Fix)

Add this rule to Firebase Storage Rules:
```javascript
allow read: if true; // For branding folder only
```

## Issue 2: Missing Firestore Index

### Problem
Queries on `support_requests` collection need an index.

### Solution
Click this link to create the required index:
https://console.firebase.google.com/v1/r/project/e-bank-dashboard/firestore/indexes?create_composite=Cllwcm9qZWN0cy9lLWJhbmstZGFzaGJvYXJkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zdXBwb3J0X3JlcXVlc3RzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI

Or:
1. Go to Firebase Console
2. Navigate to Firestore Database > Indexes
3. Create a composite index for `support_requests` collection with:
   - Field: `status` (Ascending)
   - Field: `timestamp` (Descending)

## Current Status
✅ System Settings save functionality works (except logo upload)
⚠️ Logo upload temporarily disabled due to CORS
❌ Support requests queries may fail without index

## Immediate Actions
1. Fix Firestore index (1 minute)
2. Configure Storage CORS (5 minutes)
3. Re-enable logo upload after CORS fix