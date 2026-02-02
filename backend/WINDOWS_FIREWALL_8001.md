# Windows Güvenlik Duvarı – Backend Port 8001

Telefondan `http://BILGISAYAR_IP:8001/health` açılmıyorsa Windows Güvenlik Duvarı 8001 portunu engelliyordur.

## Yöntem 1: Script ile (en kolay)

1. **Dosya Gezgini**nde `backend` klasörüne git.
2. **allow-port-8001.ps1** dosyasına **sağ tık**.
3. **"PowerShell ile Çalıştır"** seç (veya "Run with PowerShell").
4. Pencere "Yönetici olarak çalıştır" diye sorarsa **Evet** de.
5. "Kural eklendi" yazısını gördükten sonra telefondan tekrar `http://BILGISAYAR_IP:8001/health` dene (örn. 192.168.1.7).

Script yetki hatası verirse Yöntem 2’yi kullan.

## Yöntem 2: Komutu elle çalıştır

1. **Windows tuşu**na bas, **PowerShell** yaz.
2. **Windows PowerShell**e **sağ tık** → **Yönetici olarak çalıştır**.
3. Şu komutu yapıştırıp Enter’a bas:

```powershell
netsh advfirewall firewall add rule name="InuaBreath Backend 8001" dir=in action=allow protocol=TCP localport=8001
```

4. "Tamam" (OK) yazısını gördükten sonra telefondan tekrar dene.

## Kontrol listesi

- Backend çalışıyor mu? (PC’de `python server.py` çalışıyor olmalı.)
- Telefon ve PC **aynı Wi‑Fi** ağında mı?
- Yukarıdaki güvenlik duvarı kuralını **yönetici** olarak ekledin mi?
