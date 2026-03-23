# SupplySetu Application Setup Guide

## Current Status ✅

| Component | Status | Details |
|-----------|--------|---------|
| Backend Server | ✅ Running | `npm run dev` on port 3000 |
| Mobile Dependencies | ✅ Installed | React Native Expo configured |
| Android SDK | ✅ Configured | Emulator: `Pixel_6a` available |
| Admin Panel | 📋 Ready | Vanilla web app at `apps/admin-web/` |

---

## Architecture Overview

```
SupplySetu Monorepo Structure:

┌─────────────────────────────────────────────────────┐
│             BACKEND SERVER (Node.js/Express)        │
│  Root directory: d:\Supplysetu\                     │
│  ├─ Port: 3000 (Default)                            │
│  ├─ Framework: Express                              │
│  ├─ Entry: src/server.ts                            │
│  └─ Command: npm run dev                            │
└─────────────────────────────────────────────────────┘
         ↑              ↓              ↑
         │            API            │
         │          Calls            │
         │                           │
┌───────────────┐           ┌──────────────────┐
│  MOBILE APP   │           │  ADMIN PANEL     │
│ (React Native)│           │ (Vanilla Web)    │
├───────────────┤           ├──────────────────┤
│ Platform:     │           │ Location:        │
│ Android (iOS) │           │ apps/admin-web/  │
│ Port: 8081+   │           │ Port: 8000+      │
│ Emulator:     │           │ (Static/HTTP)    │
│ Pixel_6a      │           │                  │
├───────────────┤           ├──────────────────┤
│ Dev Command:  │           │ Dev Command:     │
│ npm start     │           │ python -m ...    │
│ or:           │           │ or serve with:   │
│ npm run android           │ http-server      │
└───────────────┘           └──────────────────┘
```

---

## Running Applications

### OPTION 1: Automatic Setup (Recommended)

**Terminal 1 - Backend Server (Already Running):**
```powershell
cd d:\Supplysetu
npm run dev
# ✅ Server running on http://localhost:3000
```

**Terminal 2 - Android Emulator:**
```powershell
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_SDK_ROOT\emulator\emulator" -avd Pixel_6a -no-snapshot-load
# ⏳ Wait 2-3 minutes for emulator to fully boot
# 🟢 Emulator shows Android home screen = Ready
```

**Terminal 3 - Mobile App on Emulator:**
```powershell
cd d:\Supplysetu\apps\mobile
npm run android
# 🚀 Expo will detect the running emulator and deploy the app
# ⏳ First build: 2-3 minutes (subsequent builds: 30-60 sec)
```

---

### OPTION 2: Manual Expo Metro Development Server

**If automatic deployment fails on emulator:**

```powershell
cd d:\Supplysetu\apps\mobile
npm start

# This launches Expo dev server:
# ┌─────────────────────────────────────┐
# │  Metro Bundler started               │
# │  Listening on: 192.168.x.x:8081     │
# │  Tunnel: Ready                       │
# │  Scannable QR Code: [Shown]          │
# │                                      │
# │  Options:                            │
# │  › Press a - open Android Emulator  │
# │  › Press i - open iOS Simulator     │
# │  › Press w - open web app           │
# │  › Press r - reload app             │
# │  › Press m - toggle menu            │
# └─────────────────────────────────────┘

# Then press "a" to launch on Android emulator
```

---

### OPTION 3: Admin Panel (Simple Web App)

The admin panel at `apps/admin-web/` requires an HTTP server:

**Using Python:**
```powershell
cd d:\Supplysetu\apps\admin-web
python -m http.server 8000
# 📂 Admin panel: http://localhost:8000
```

**Using Node.js (http-server):**
```powershell
npm install -g http-server
cd d:\Supplysetu\apps\admin-web
http-server -p 8000
# 📂 Admin panel: http://localhost:8000
```

**Using npx (no global install):**
```powershell
cd d:\Supplysetu\apps\admin-web
npx http-server -p 8000
# 📂 Admin panel: http://localhost:8000
```

---

## Complete Multi-Terminal Setup

**For full development, open 4 terminals:**

| Terminal | Command | Waits For | Access Point |
|----------|---------|-----------|--------------|
| T1 | `cd d:\Supplysetu && npm run dev` | - | Backend: `http://localhost:3000` |
| T2 | Emulator startup script (below) | 2-3 min | Android Device |
| T3 | `cd d:\Supplysetu\apps\mobile && npm run android` | T2 ready | App on Emulator |
| T4 | `cd d:\Supplysetu\apps\admin-web && npx http-server -p 8000` | - | Admin: `http://localhost:8000` |

---

## Emulator Boot Script (PowerShell)

Save as `start-emulator.ps1`:

```powershell
# Set Android SDK path
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_SDK_ROOT\platform-tools"

# Check if emulator is already running
$devices = & adb devices
if ($devices -match "emulator") {
    Write-Host "✅ Emulator already running, skipping boot..." -ForegroundColor Green
} else {
    Write-Host "🚀 Starting Pixel_6a emulator..." -ForegroundColor Yellow
    & "$env:ANDROID_SDK_ROOT\emulator\emulator" -avd Pixel_6a -no-snapshot-load &
    
    Write-Host "⏳ Waiting for emulator to boot (2-3 minutes)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Show boot progress
    $attempts = 0
    while ($attempts -lt 60) {
        $bootStatus = & adb shell getprop sys.boot_completed
        if ($bootStatus -eq "1") {
            Write-Host "✅ Emulator fully booted!" -ForegroundColor Green
            break
        }
        Write-Host "⏳ Booting... ($attempts/60)" -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        $attempts++
    }
}

Write-Host "✅ Ready to deploy app!" -ForegroundColor Green
Write-Host "Run: cd d:\Supplysetu\apps\mobile && npm run android" -ForegroundColor Cyan
```

Run with:
```powershell
.\start-emulator.ps1
```

---

## What Each Application Does

### 1. Backend Server (Port 3000)
- **Purpose**: REST API for retailer orders, catalogs, auth
- **Tech**: Node.js, Express, PostgreSQL
- **Endpoints**: 
  - `/api/orders/*` - Order management
  - `/api/retailers/*` - Retailer data
  - `/api/products/*` - Product catalog
  - `/api/auth/*` - Authentication
- **Status Check**: `curl http://localhost:3000/health` (if available)

### 2. Mobile App (Retailer App)
- **Purpose**: Mobile interface for retailers to place orders
- **Tech**: React Native, Expo, TypeScript
- **Screens**: 
  - Catalog & Product Browse
  - Shopping Cart
  - Order Placement
  - Order History
  - Profile/Account
- **Platform**: iOS (12+), Android (API 30+)
- **Development Server Port**: 8081+ (managed by Expo)

### 3. Admin Web Panel
- **Purpose**: Admin interface for managing orders, retailers, schemes
- **Tech**: Vanilla JavaScript, HTML, CSS
- **Files**:
  - `index.html` - Main layout
  - `app.js` - Logic
  - `styles.css` - Styling
- **Server Port**: 8000 (via http-server or Python)

---

## Troubleshooting

### Problem: "No Android connected device found"
**Solution:**
1. Check emulator process: `tasklist | findstr emulator`
2. If not running, start it: `. .\start-emulator.ps1`
3. Wait for boot: `adb devices` should show `emulator-5554 device`

### Problem: "Port 3000 already in use"
**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Retry: npm run dev
```

### Problem: "Expo Metro bundler slow on first boot"
**Solution:**
- First build is slow (2-3 min) - normal behavior
- Subsequent builds cache, taking ~30-60 sec
- Clear cache if needed: `npm start -- --clear`

### Problem: "Emulator won't start"
**Solution:**
```powershell
# Try alternative emulator
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_SDK_ROOT\emulator\emulator" -avd Medium_Phone_API_36.1
```

### Problem: "Backend not connecting from mobile app"
**Solution:**
- In Android emulator: Backend runs on `10.0.2.2:3000` (not `localhost:3000`)
- Update API config if needed: `services/api/client.ts`
- Check backend logs for errors

---

## Development Commands Reference

```powershell
# BACKEND
cd d:\Supplysetu
npm run dev              # Start dev server
npm run build            # Compile TypeScript
npm run lint             # Check types
npm test                 # Run tests
npm run migrate:latest   # Apply DB migrations

# MOBILE
cd d:\Supplysetu\apps\mobile
npm start                # Start Expo metro bundler (choose platform manually)
npm run android          # Auto-build + deploy to Android emulator
npm run lint             # Check TypeScript

# ADMIN PANEL
cd d:\Supplysetu\apps\admin-web
npx http-server -p 8000 # Serve on port 8000

# ANDROID EMULATOR
adb devices              # List connected devices
adb shell               # Open shell in emulator
adb logcat              # View Android system logs
```

---

## Performance Expectations

| Action | Expected Time | Notes |
|--------|---------------|-------|
| Backend server start | <2 sec | Instant |
| Emulator boot | 2-3 min | First time longer |
| Mobile app deploy (cold) | 2-3 min | First build includes Metro |
| Mobile app deploy (hot) | 30-60 sec | Cached builds |
| Mobile app hot-reload | <5 sec | Edit & save in editor |
| Admin panel load | <1 sec | Static HTML + JS |

---

## Next Steps

1. ✅ **Verify backend is running**: Check terminal T1 (npm run dev)
2. ⏳ **Start emulator**: Run emulator boot script in T2
3. 🚀 **Deploy mobile app**: Run `npm run android` in T3 once emulator is ready
4. 🎨 **Access admin panel**: Open `http://localhost:8000` in browser

---

**Created**: March 21, 2026  
**Status**: Ready for setup  
**Support**: Check terminal outputs for detailed error messages

