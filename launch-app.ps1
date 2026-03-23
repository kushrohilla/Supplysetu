#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Launcher for SupplySetu applications (Backend, Mobile, Admin)
.DESCRIPTION
    Interactive menu to start any combination of backend, mobile emulator, and admin panel
.EXAMPLE
    .\launch-app.ps1
#>

function Show-Menu {
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║           SupplySetu Application Launcher                ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Select what to run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1) Backend Server (Node.js/Express on port 3000)" -ForegroundColor White
    Write-Host "  2) Android Emulator (Pixel_6a)" -ForegroundColor White
    Write-Host "  3) Mobile App (Deploy to Emulator)" -ForegroundColor White
    Write-Host "  4) Admin Panel Web (Python HTTP Server on port 8000)" -ForegroundColor White
    Write-Host ""
    Write-Host "  5) 🚀 FULL STACK (Backend + Emulator + Mobile + Admin in 4 terminals)" -ForegroundColor Green
    Write-Host "  6) 📱 MOBILE ONLY (Emulator + Mobile App)" -ForegroundColor Green
    Write-Host "  7) 🎨 ADMIN ONLY (Admin Panel + Backend)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  0) Exit" -ForegroundColor Red
    Write-Host ""
    Write-Host "Note: Options 5-7 will open new PowerShell windows" -ForegroundColor Gray
    Write-Host ""
}

function Start-Backend {
    Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
    Write-Host "   Command: cd d:\Supplysetu && npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    Set-Location d:\Supplysetu
    npm run dev
}

function Start-Emulator {
    Write-Host "🚀 Starting Android Emulator..." -ForegroundColor Green
    if (Test-Path .\start-emulator.ps1) {
        & .\start-emulator.ps1
    } else {
        Write-Host "Running emulator startup script from root..." -ForegroundColor Yellow
        & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator" -avd Pixel_6a -no-snapshot-load
    }
}

function Start-Mobile {
    Write-Host "🚀 Deploying Mobile App..." -ForegroundColor Green
    Write-Host "   Command: cd d:\Supplysetu\apps\mobile && npm run android" -ForegroundColor Gray
    Write-Host ""
    Set-Location d:\Supplysetu\apps\mobile
    npm run android
}

function Start-Admin {
    Write-Host "🚀 Starting Admin Panel..." -ForegroundColor Green
    Write-Host "   Command: cd d:\Supplysetu\apps\admin-web && npx http-server -p 8000" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📂 Admin Panel will be available at: http://localhost:8000" -ForegroundColor Cyan
    Write-Host ""
    Set-Location d:\Supplysetu\apps\admin-web
    npx http-server -p 8000
}

function Start-FullStack {
    Write-Host "🚀 Starting Full Stack (4 terminals)..." -ForegroundColor Green
    Write-Host ""
    
    # Terminal 1: Backend
    Write-Host "📋 Opening Terminal 1: Backend Server" -ForegroundColor Yellow
    $backendScript = {
        cd d:\Supplysetu
        npm run dev
        Read-Host "Press Enter to close this window"
    }
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd d:\Supplysetu; npm run dev" -WindowStyle Normal

    Start-Sleep -Seconds 2

    # Terminal 2: Emulator
    Write-Host "📋 Opening Terminal 2: Android Emulator" -ForegroundColor Yellow
    $emulatorScript = {
        cd d:\Supplysetu
        & .\start-emulator.ps1
        Read-Host "Press Enter to close this window"
    }
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd d:\Supplysetu; & .\start-emulator.ps1" -WindowStyle Normal

    Start-Sleep -Seconds 2

    # Terminal 3: Mobile App
    Write-Host "📋 Opening Terminal 3: Mobile App (wait 2+ min for emulator to boot first!)" -ForegroundColor Yellow
    Write-Host "    If it fails, re-run manually:" -ForegroundColor Gray
    Write-Host "    cd d:\Supplysetu\apps\mobile && npm run android" -ForegroundColor Gray
    $mobileScript = {
        Start-Sleep -Seconds 120
        cd d:\Supplysetu\apps\mobile
        npm run android
        Read-Host "Press Enter to close this window"
    }
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Start-Sleep -Seconds 120; cd d:\Supplysetu\apps\mobile; npm run android" -WindowStyle Normal

    Start-Sleep -Seconds 2

    # Terminal 4: Admin Panel
    Write-Host "📋 Opening Terminal 4: Admin Panel" -ForegroundColor Yellow
    Write-Host "    Access at: http://localhost:8000" -ForegroundColor Cyan
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd d:\Supplysetu\apps\admin-web; npx http-server -p 8000" -WindowStyle Normal

    Write-Host ""
    Write-Host "✅ All terminals opened!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Timing:" -ForegroundColor Yellow
    Write-Host "  T1 (Backend): Starts immediately" -ForegroundColor White
    Write-Host "  T2 (Emulator): Boots in ~2-3 minutes" -ForegroundColor White
    Write-Host "  T3 (Mobile): Waits for emulator then deploys (~2 min more)" -ForegroundColor White
    Write-Host "  T4 (Admin): Starts immediately at http://localhost:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "Total time to fully running: ~5 minutes" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to return to launcher"
}

function Start-MobileOnly {
    Write-Host "📱 Starting Mobile Stack (Emulator + Mobile App)..." -ForegroundColor Green
    Write-Host ""

    # Terminal 1: Emulator
    Write-Host "📋 Opening Terminal 1: Android Emulator" -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd d:\Supplysetu; & .\start-emulator.ps1" -WindowStyle Normal

    Start-Sleep -Seconds 2

    # Terminal 2: Mobile App
    Write-Host "📋 Opening Terminal 2: Mobile App" -ForegroundColor Yellow
    Write-Host "    (Waits 2 min for emulator to boot)" -ForegroundColor Gray
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Start-Sleep -Seconds 120; cd d:\Supplysetu\apps\mobile; npm run android" -WindowStyle Normal

    Write-Host ""
    Write-Host "✅ Mobile terminals opened!" -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to return to launcher"
}

function Start-AdminOnly {
    Write-Host "🎨 Starting Admin Stack (Backend + Admin Panel)..." -ForegroundColor Green
    Write-Host ""

    # Terminal 1: Backend
    Write-Host "📋 Opening Terminal 1: Backend Server" -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd d:\Supplysetu; npm run dev" -WindowStyle Normal

    Start-Sleep -Seconds 2

    # Terminal 2: Admin Panel
    Write-Host "📋 Opening Terminal 2: Admin Panel" -ForegroundColor Yellow
    Write-Host "    Access at: http://localhost:8000" -ForegroundColor Cyan
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd d:\Supplysetu\apps\admin-web; npx http-server -p 8000" -WindowStyle Normal

    Write-Host ""
    Write-Host "✅ Admin terminals opened!" -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to return to launcher"
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (0-7)"
    Write-Host ""

    switch ($choice) {
        "1" { Start-Backend }
        "2" { Start-Emulator }
        "3" { Start-Mobile }
        "4" { Start-Admin }
        "5" { Start-FullStack }
        "6" { Start-MobileOnly }
        "7" { Start-AdminOnly }
        "0" { 
            Write-Host "Goodbye!" -ForegroundColor Green
            Exit 0
        }
        default { 
            Write-Host "Invalid choice. Press Enter to continue..." -ForegroundColor Red
            Read-Host
        }
    }
} while ($true)
