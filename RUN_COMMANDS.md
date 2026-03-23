# SupplySetu - Running Commands Guide

This document contains all the commands needed to run the SupplySetu application stack locally.

## Prerequisites

- Node.js >= 20.0.0
- Android SDK with Emulator
- PowerShell 5.1+

---

## 🚀 Quick Start Options

### Option 1: Full Stack (Recommended)
Run all services in separate terminals:

**Terminal 1 - Backend Server (Port 3000):**
```powershell
cd d:\Supplysetu
npm run dev
```

**Terminal 2 - Android Emulator (Starts first, takes ~2-3 minutes to boot):**
```powershell
cd d:\Supplysetu
& .\start-emulator.ps1
```

**Terminal 3 - Mobile App (Start AFTER emulator is fully booted):**
```powershell
cd d:\Supplysetu\apps\mobile
npm run android
```

**Terminal 4 - Admin Panel (Port 8000):**
```powershell
cd d:\Supplysetu\apps\admin-web
npx http-server -p 8000
```

**Expected Timeline:**
- T1 (Backend): Starts immediately
- T2 (Emulator): Takes ~2-3 minutes to fully boot
- T3 (Mobile): Deploy takes ~2 minutes after emulator boots
- T4 (Admin): Starts immediately
- **Total time: ~5 minutes to full startup**

---

## 📱 Individual Component Commands

### Backend Server
```powershell
cd d:\Supplysetu
npm run dev
```
- Runs on port **3000**
- Uses tsx watch for hot reloading
- Access: http://localhost:3000

### Android Emulator
```powershell
cd d:\Supplysetu
& .\start-emulator.ps1
```
Or run directly:
```powershell
$emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
& $emulatorPath -avd Pixel_6a -no-snapshot-load
```
- Emulator: **Pixel_6a**
- Boots in ~2-3 minutes
- Check status: `adb devices`

### Mobile App (React Native/Expo)
```powershell
cd d:\Supplysetu\apps\mobile
npm install
npm run android
```
- Deploys to connected emulator or device
- Uses Expo for development
- Requires emulator to be running first

### Admin Panel
```powershell
cd d:\Supplysetu\apps\admin-web
npm install
npx http-server -p 8000
```
- Runs on port **8000**
- Static web server serving admin files
- Access: http://localhost:8000

---

## 🛠️ Database Migrations

### Create Migration
```powershell
cd d:\Supplysetu
npm run migrate:make -- migration_name
```

### Run Latest Migrations
```powershell
cd d:\Supplysetu
npm run migrate:latest
```

### Rollback Migration
```powershell
cd d:\Supplysetu
npm run migrate:rollback
```

---

## 📋 Other Useful Commands

### Backend Development
```powershell
# Lint check
cd d:\Supplysetu
npm run lint

# Build
cd d:\Supplysetu
npm build

# Production start (after build)
cd d:\Supplysetu
npm start

# Run tests
cd d:\Supplysetu
npm test
```

### Mobile App Development
```powershell
cd d:\Supplysetu\apps\mobile

# Start development server
npm start

# or iOS (Mac only)
npm run ios

# Lint check
npm run lint
```

### Check Service Status

**Backend (Port 3000):**
```powershell
netstat -ano | Select-String "3000"
```

**Admin Panel (Port 8000):**
```powershell
netstat -ano | Select-String "8000"
```

**Emulator/Device Status:**
```powershell
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adbPath devices
```

**Installed Packages on Emulator:**
```powershell
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adbPath shell pm list packages | Select-String "supplysetu"
```

---

## 🌐 Access Points

| Service | URL | Port |
|---------|-----|------|
| Backend API | http://localhost:3000 | 3000 |
| Admin Panel | http://localhost:8000 | 8000 |
| Mobile App | Emulator (Pixel_6a) | N/A |

---

## ⚠️ Common Issues & Solutions

### Emulator won't start
```powershell
# List available virtual devices
$emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
& $emulatorPath -list-avds

# Kill existing emulator process
taskkill /IM qemu-system-x86_64.exe /F
```

### Mobile app deployment fails
```powershell
# Clean build
cd d:\Supplysetu\apps\mobile
rm -r node_modules, package-lock.json
npm install
npm run android
```

### Backend server won't start
```powershell
# Check if port 3000 is in use
netstat -ano | Select-String "3000"

# Kill process using port 3000 (replace PID accordingly)
taskkill /PID <PID> /F

# Restart backend
cd d:\Supplysetu
npm run dev
```

### Admin panel not accessible
```powershell
# Check if port 8000 is in use
netstat -ano | Select-String "8000"

# Reinstall http-server
cd d:\Supplysetu\apps\admin-web
npx http-server -p 8000
```

---

## 📝 Notes

- Always start the **emulator first** before deploying the mobile app
- The **backend server** must be running for API calls from mobile and admin panels
- Use separate terminal windows/tabs for each service for better visibility
- Services run in the foreground by default (use Ctrl+C to stop)
- Environment variables are configured in `.env` file

---

## 🔗 Related Documentation

- [Backend Architecture](./docs/architecture.md)
- [Mobile Architecture](./docs/mobile-architecture.md)
- [API Contract](./docs/api-contract.md)
- [Setup Guide](./SETUP_GUIDE.md)
