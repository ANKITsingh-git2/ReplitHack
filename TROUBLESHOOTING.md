# 🔧 Troubleshooting Guide

## Issue: Nothing showing on localhost:3000

### ✅ Fixed Issues

1. **TypeScript syntax in JavaScript file** - Fixed
   - Removed all type annotations (`: string`, `: number`) from `public/app.js`
   - JavaScript doesn't support TypeScript type annotations

### Quick Fixes

1. **Kill existing server processes:**
   ```bash
   pkill -f "ts-node-dev"
   pkill -f "node.*server"
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **If port is still in use:**
   ```bash
   # Find and kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   # Or change port in src/server.ts (line 109)
   ```

4. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private mode

5. **Check browser console:**
   - Open DevTools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab to see if files are loading

### Common Issues

#### Server won't start
- **Error: EADDRINUSE** - Port 3000 is in use
  - Solution: Kill existing process or change port

#### Blank page
- **JavaScript errors** - Check browser console
- **Files not loading** - Check Network tab in DevTools
- **CORS issues** - Should be handled, but check if API calls are failing

#### Login not working
- **Check database** - SQLite files should be created
- **Default credentials:**
  - Email: `admin@agentverse.com`
  - Password: `admin123`

### Debug Steps

1. **Check if server is running:**
   ```bash
   curl http://localhost:3000/
   ```

2. **Check server logs:**
   - Look for startup messages
   - Check for error messages

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for errors in Console
   - Check Network tab for failed requests

4. **Verify files exist:**
   ```bash
   ls -la public/
   ls -la dist/
   ```

### Still Not Working?

1. **Rebuild the project:**
   ```bash
   npm run build
   npm run dev
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   npm run dev
   ```

3. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```

4. **Check JavaScript syntax:**
   ```bash
   node -c public/app.js
   ```

---

**If nothing works, check the browser console for specific error messages!**

