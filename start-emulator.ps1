#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Android Emulator with boot progress monitoring
.DESCRIPTION
    Starts the Pixel_6a emulator and waits for a completed Android boot.
.EXAMPLE
    .\start-emulator.ps1
#>

$ErrorActionPreference = "Stop"

$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$adbPath = Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe"
$emulatorPath = Join-Path $env:ANDROID_SDK_ROOT "emulator\emulator.exe"
$avdName = "Pixel_6a"

Write-Host "Android Emulator Starter" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for running emulators..." -ForegroundColor Yellow
$devices = & $adbPath devices
if ($devices -match "emulator-\d+\s+device") {
    Write-Host "Emulator already running." -ForegroundColor Green
    & $adbPath devices
    exit 0
}

Write-Host "Starting $avdName..." -ForegroundColor Yellow
Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $avdName, "-no-snapshot-load", "-wipe-data" | Out-Null

Write-Host "Waiting for emulator to be detected..." -ForegroundColor Yellow
for ($attempt = 1; $attempt -le 30; $attempt++) {
    Start-Sleep -Seconds 2
    $devices = & $adbPath devices
    if ($devices -match "emulator-\d+\s+device") {
        Write-Host "Emulator detected." -ForegroundColor Green
        break
    }

    if ($attempt -eq 30) {
        Write-Host "Emulator failed to start." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Waiting for Android OS to finish booting..." -ForegroundColor Yellow
for ($attempt = 1; $attempt -le 120; $attempt++) {
    $bootStatus = (& $adbPath shell getprop sys.boot_completed 2>$null).Trim()
    if ($bootStatus -eq "1") {
        Write-Host "Emulator fully booted." -ForegroundColor Green
        Write-Host ""
        Write-Host "Next step:" -ForegroundColor Cyan
        Write-Host "  cd d:\Supplysetu\apps\mobile" -ForegroundColor White
        Write-Host "  npm run android" -ForegroundColor White
        Write-Host ""
        & $adbPath devices
        exit 0
    }

    Start-Sleep -Seconds 3
}

Write-Host "Emulator boot timed out." -ForegroundColor Red
exit 1
