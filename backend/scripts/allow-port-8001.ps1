# InuaBreath Backend - Port 8001'i Windows Güvenlik Duvarı'nda aç
# Bu dosyaya SAĞ TIK -> "PowerShell ile Çalıştır" (veya PowerShell'i Yönetici olarak aç, sonra: .\allow-port-8001.ps1)

$ruleName = "InuaBreath Backend 8001"
$existing = netsh advfirewall firewall show rule name=$ruleName 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Kural zaten var: $ruleName" -ForegroundColor Yellow
} else {
    netsh advfirewall firewall add rule name=$ruleName dir=in action=allow protocol=TCP localport=8001
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Kural eklendi. Telefondan http://BILGISAYAR_IP:8001/health adresini dene." -ForegroundColor Green
    } else {
        Write-Host "HATA: PowerShell'i Yonetici olarak calistirin (sag tik -> Yonetici olarak calistir)" -ForegroundColor Red
    }
}
