# Production Auth Persistence Debug Guide

## ✅ Debug Logging Implemented

Comprehensive logging has been added to track the authentication flow in production. All logs are prefixed with emojis for easy filtering.

---

## 📊 What to Monitor

### 1. **Provider Instance Tracking**
Watch for these on page navigation:
```
🔄 [SOLANA WALLET PROVIDER MOUNT]
🆔 Instance ID: abc123xyz
```
```
🔄 [WALLET INIT PROVIDER MOUNT]
🆔 Instance ID: def456uvw
```
```
🚀 [AUTH PROVIDER MOUNT]
🆔 Instance ID: ghi789rst
```

**❌ BAD**: Instance IDs change on every page navigation → Providers are re-mounting
**✅ GOOD**: Same instance IDs across navigation → Providers stay mounted

---

### 2. **Storage Operations**
Watch for authentication save:
```
💾 [SAVING AUTH] Storing to localStorage...
✅ [AUTH SAVED] { walletAddress: '...', timestamp: ..., tokenExpiry: ... }
✅ [VERIFIED] Session data: { ... }
```

Watch for authentication restore:
```
📦 [STORAGE CHECK] { hasToken: true, tokenPreview: '...', lastWallet: '...', authSession: {...} }
✅ [TOKEN VALID] Restoring authentication
✅ [AUTH RESTORED] from storage
```

**❌ BAD**: Storage shows empty or null
**✅ GOOD**: Storage contains valid data

---

### 3. **Authentication Requests**
Every signature request logs:
```
🔐 [AUTH REQUEST] Signature request triggered
📍 Path: /strategies
🆔 Instance: abc123xyz
📊 Call stack: [shows where it was triggered from]
```

Then shows guard checks:
```
🔍 [AUTH CHECK] { currentWallet: '...', isAuthenticated: true, authSession: {...} }
✅ [GUARD 1] Already authenticated for this wallet
  Time since auth: 45 seconds
✅ [AUTH SKIP] Still within valid period
```

**❌ BAD**: Auth guards are not blocking requests
**✅ GOOD**: Guards block repeated auth requests

---

### 4. **Wallet Effect Triggers**
Tracks when wallet connection triggers auth checks:
```
🔄 [WALLET EFFECT] Triggered { isInitialized: true, connected: true, hasPublicKey: true, isAuthenticated: true, isAuthenticating: false }
✅ [ALREADY AUTHENTICATED] Skipping auth check
```

**❌ BAD**: Always shows "Not authenticated" or "Triggering authentication"
**✅ GOOD**: Shows "ALREADY AUTHENTICATED" after first auth

---

## 🔍 How to Debug in Production

### Step 1: Deploy and Open DevTools
1. Deploy your updated code to Vercel
2. Open production site in incognito/private window
3. Open DevTools → Console tab
4. Filter console by typing `[` to see only bracketed logs

### Step 2: Initial Connection
1. Click "Connect Wallet"
2. Approve connection
3. Sign the authentication message
4. Look for these logs:
   ```
   💾 [SAVING AUTH] Storing to localStorage...
   ✅ [AUTH SAVED]
   ✅ [VERIFIED] Session data
   ✅ [AUTH SUCCESS] Authentication complete!
   ```

### Step 3: Navigate Between Pages
1. Go to Dashboard → Strategies → Swap → Home
2. Watch console for EACH navigation

**What to look for:**

**SCENARIO A: Provider Re-mounting (ROOT CAUSE)**
```
// On EVERY page navigation:
🔄 [AUTH PROVIDER MOUNT]
🆔 Instance ID: abc123  ← Different each time
🔍 [INIT CHECK] Starting initialization...
📦 [STORAGE CHECK] { hasToken: true, ... }
✅ [TOKEN VALID] Restoring authentication
🔄 [WALLET EFFECT] Triggered
❌ [NO VALID TOKEN] Triggering authentication...  ← BUG!
🔐 [AUTH REQUEST] Signature request triggered
```
**Problem**: Provider remounts, loses React state, re-triggers auth

**SCENARIO B: Storage Being Cleared**
```
// After navigation:
📦 [STORAGE CHECK] { hasToken: false, ... }  ← Storage lost!
ℹ️ [NO TOKEN] No existing authentication
```
**Problem**: localStorage is being cleared between navigations

**SCENARIO C: Guards Not Working**
```
🔐 [AUTH REQUEST] Signature request triggered
🔍 [AUTH CHECK] { isAuthenticated: false, authSession: null }  ← Lost state!
```
**Problem**: React state is lost but storage exists

**SCENARIO D: Working Correctly ✅**
```
// After navigation - only these logs:
🔄 [WALLET EFFECT] Triggered
✅ [ALREADY AUTHENTICATED] Skipping auth check
// NO signature request!
```
**Success**: Auth persists correctly

---

## 🐛 Root Cause Solutions

### Issue 1: Providers Re-mounting on Navigation
**Symptom**: Different Instance IDs on each page
**Cause**: Providers are not at root level or Next.js is doing full reloads
**Fix**:
- Verify layout.tsx structure (already correct in your case)
- Check for `<a>` tags instead of Next.js `<Link>` components
- Ensure no React.StrictMode in production

### Issue 2: localStorage Being Cleared
**Symptom**: Storage shows null after navigation
**Cause**: Browser extension, middleware, or service worker
**Fix**:
- Test in different browsers
- Disable all extensions
- Check Network tab for any requests clearing storage
- Consider using cookies instead:
  ```bash
  npm install js-cookie
  ```

### Issue 3: React State Lost But Storage Exists
**Symptom**: Storage has data but `isAuthenticated` is false
**Cause**: State not being restored from storage on mount
**Fix**: Already handled in initialization useEffect

### Issue 4: Auth Guards Not Blocking
**Symptom**: Guards pass but signature still requested
**Cause**: Multiple auth check paths
**Fix**: Check call stack to find alternative auth trigger points

---

## 📋 Questions to Answer from Logs

After testing in production, answer these:

1. **Do Instance IDs change on navigation?**
   - [ ] Yes → Providers are re-mounting
   - [ ] No → Providers stay mounted ✅

2. **Is localStorage populated after signing?**
   - Check: `💾 [SAVING AUTH]` and `✅ [VERIFIED]` logs
   - [ ] Yes → Storage works ✅
   - [ ] No → Storage write failing

3. **Is localStorage preserved after navigation?**
   - Check: `📦 [STORAGE CHECK]` shows `hasToken: true`
   - [ ] Yes → Storage persists ✅
   - [ ] No → Storage being cleared

4. **Are auth guards working?**
   - Check: `✅ [AUTH SKIP]` logs appear on navigation
   - [ ] Yes → Guards work ✅
   - [ ] No → Guards not blocking

5. **Does WALLET EFFECT show "ALREADY AUTHENTICATED"?**
   - Check: `✅ [ALREADY AUTHENTICATED]` on navigation
   - [ ] Yes → State persists ✅
   - [ ] No → State is lost

---

## 🚨 Quick Checks in Browser DevTools

### Check localStorage Manually
```javascript
// Run in console:
console.log('auth_token:', localStorage.getItem('auth_token'));
console.log('auth_session:', localStorage.getItem('auth_session'));
console.log('last_wallet_address:', localStorage.getItem('last_wallet_address'));
```

### Check for Storage Events
```javascript
// Add listener to detect storage changes:
window.addEventListener('storage', (e) => {
  console.log('🔔 Storage event:', e.key, e.oldValue, e.newValue);
});
```

### Manually Test Storage
```javascript
// Test write:
localStorage.setItem('test_persist', Date.now().toString());

// Navigate to another page, then check:
console.log('Test persisted:', localStorage.getItem('test_persist'));
```

---

## 📤 What to Share for Further Debug

If issue persists, share:

1. **Full console output** from initial connection through 3 page navigations
2. **Instance IDs** - do they change?
3. **localStorage contents** before and after navigation
4. **Call stack** from any `🔐 [AUTH REQUEST]` logs
5. **Answers** to the 5 questions above
6. **Browser** and version being used
7. **Any errors** in console (red text)

---

## 🔧 Alternative Solutions

### Option 1: Use Cookies Instead of localStorage
If localStorage is unreliable in production:
```bash
npm install js-cookie
```

Then modify AuthContext storage functions to use cookies.

### Option 2: Keep Auth in Memory Only
Remove storage entirely, keep in React state:
- Pros: No storage issues
- Cons: Lost on page refresh (may be acceptable)

### Option 3: Use Server-Side Sessions
Move auth to server-side sessions with HTTP-only cookies:
- Most secure
- Requires backend changes

---

## ✅ Expected Working Behavior

After fix:
1. User connects wallet → Signs ONCE ✅
2. Navigate to any page → NO signature popup ✅
3. Refresh page → Auth restored from storage ✅
4. Console shows `✅ [ALREADY AUTHENTICATED]` on navigation ✅
5. Only re-auth after 5 minutes or wallet change ✅

---

## 📞 Next Steps

1. Deploy this updated code to Vercel
2. Test in production with DevTools open
3. Copy all console logs
4. Answer the 5 questions from logs
5. Share findings for further assistance if needed

