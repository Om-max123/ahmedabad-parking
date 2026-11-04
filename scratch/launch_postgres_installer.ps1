$installer = "C:\Users\omdha\AppData\Local\Temp\WinGet\PostgreSQL.PostgreSQL.16.16.15-5\postgresql-16.15-5-windows-x64.exe"
if (Test-Path $installer) {
    Write-Host "Launching PostgreSQL 16 Installer..."
    Start-Process -FilePath $installer
} else {
    Write-Host "Installer file not found at $installer"
}
