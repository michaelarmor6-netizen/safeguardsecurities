# Firebase Content Security Policy (CSP) Configuration

## 🔒 CSP Issue Resolution

### Problem
The application was experiencing CSP violations when trying to connect to Firebase services, specifically:
```
Connecting to 'https://identitytoolkit.googleapis.com/v1/accounts:signUp' violates the following Content Security Policy directive: "connect-src 'self' https://*.firebase.googleapis.com https://*.firebaseio.com"
```

### Root Cause
The Content Security Policy was missing essential Firebase domains that are required for authentication and other Firebase services.

## ✅ Solution Implemented

### Updated CSP Configuration
The CSP has been updated to include all necessary Firebase domains:

#### Development Server (`server.headers`)
```typescript
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://firebase.googleapis.com ws: wss:;"
```

#### Production Preview (`preview.headers`)
```typescript
'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://firebase.googleapis.com;"
```

## 🌐 Required Firebase Domains

### Authentication Services
- `identitytoolkit.googleapis.com` - Firebase Auth API
- `securetoken.googleapis.com` - Token refresh and validation
- `firebase.googleapis.com` - Core Firebase services

### Database & Storage
- `*.firebaseio.com` - Realtime Database
- `*.googleapis.com` - Firestore, Storage, and other Google APIs
- `*.cloudfunctions.net` - Cloud Functions

### Development Tools
- `ws:` and `wss:` - WebSocket connections for dev tools
- `'unsafe-eval'` - Required for development hot reloading

## 🔧 CSP Directives Explained

### `default-src 'self'`
- Fallback for all resource types
- Only allows resources from same origin

### `script-src 'self'` (Production) / `'self' 'unsafe-eval'` (Development)
- JavaScript execution policy
- `'unsafe-eval'` needed for development hot reloading

### `style-src 'self' 'unsafe-inline' fonts.googleapis.com`
- CSS loading policy
- `'unsafe-inline'` needed for Tailwind and component styles
- `fonts.googleapis.com` for Google Fonts CSS

### `font-src 'self' fonts.gstatic.com`
- Font loading policy
- `fonts.gstatic.com` for Google Fonts files

### `img-src 'self' data: https:`
- Image loading policy
- `data:` for base64 images
- `https:` for secure external images

### `connect-src` (Most Important for Firebase)
- Network request policy
- Includes all Firebase service domains

## 🚨 Common CSP Violations and Fixes

### 1. Authentication Failures
**Error**: `identitytoolkit.googleapis.com` blocked
**Fix**: Add `https://identitytoolkit.googleapis.com` to `connect-src`

### 2. Token Refresh Failures
**Error**: `securetoken.googleapis.com` blocked
**Fix**: Add `https://securetoken.googleapis.com` to `connect-src`

### 3. Firestore/Storage Access
**Error**: `*.googleapis.com` blocked
**Fix**: Add `https://*.googleapis.com` to `connect-src`

### 4. Cloud Functions
**Error**: `*.cloudfunctions.net` blocked
**Fix**: Add `https://*.cloudfunctions.net` to `connect-src`

## 🔍 Testing CSP Configuration

### 1. Check Browser Console
Look for CSP violation messages:
```
Refused to connect because it violates the document's Content Security Policy
```

### 2. Test Authentication
- Try signup/login operations
- Monitor network requests in DevTools
- Verify Firebase connections succeed

### 3. Test All Firebase Services
- Authentication (signup, login, password reset)
- Firestore operations (read, write)
- Storage operations (upload, download)
- Cloud Functions calls

## 🌍 Production Deployment Notes

### Hosting Platform Considerations

#### Firebase Hosting
- Supports CSP headers via `firebase.json`
- Can override Vite CSP configuration

#### Vercel/Netlify
- Configure CSP headers in platform-specific config files
- Ensure Firebase domains are included

#### Custom Hosting
- Configure CSP headers at server level
- Test thoroughly with actual Firebase operations

### Security Best Practices

1. **Principle of Least Privilege**: Only allow necessary domains
2. **Regular Audits**: Review and update CSP as Firebase services evolve
3. **Environment-Specific CSP**: Stricter policies for production
4. **Monitoring**: Set up CSP violation reporting

## 🔄 Maintenance

### When to Update CSP
- New Firebase services added to project
- Firebase SDK updates
- New external integrations
- Security policy changes

### Monitoring CSP Violations
```javascript
// Add CSP violation reporting
document.addEventListener('securitypolicyviolation', (e) => {
  console.error('CSP Violation:', e.violatedDirective, e.blockedURI);
});
```

## ✅ Verification Checklist

- [ ] Authentication works (signup, login, logout)
- [ ] Password reset emails send successfully
- [ ] Firestore operations complete without errors
- [ ] Storage uploads/downloads work
- [ ] No CSP violations in browser console
- [ ] All Firebase features function correctly

## 🆘 Troubleshooting

If you encounter CSP violations:

1. **Identify the blocked domain** from console error
2. **Add the domain** to appropriate CSP directive
3. **Rebuild and test** the application
4. **Verify** no other violations occur

Remember: CSP is a security feature, so only add domains that are absolutely necessary for your application to function.