# AI Yanblik BBPOM — Cloudflare Pages rebuild

Frontend statis (tanpa build). Backend satu Google Apps Script (`../Code.gs`) sebagai JSON API untuk extractor + dashboard monitoring. Satu spreadsheet monitoring, satu API key Gemini, kuota global 5 RPM / 20 RPD dihitung di GAS.

## 1. Update GAS (pakai deployment existing)

1. Buka Apps Script project existing → ganti isi `Code.gs` dengan [Code.gs](../Code.gs). File `PopupIndex.html` tetap, tidak diubah.
2. Deploy → Manage deployments → edit → New version. Execute as: Me. Who has access: Anyone.
3. Salin URL `/exec` baru → tempel ke `GAS_URL` di `web/config.js`.
4. Tes cepat (ganti EXEC_URL):
   - `curl "EXEC_URL?action=quota"` → `{"ok":true,"quota":{...}}`
   - POST analyze/save pakai Content-Type text/plain.

## 2. Push ke GitHub (kerja sekali dari folder ini)

```powershell
cd web
git init -b main
git add index.html monitoring.html login.html app.js config.js
git commit -m "Gabung monitoring dashboard (DB monitoring), nav 2 arah"
gh repo create yanblik-bbpom --public --source=. --push
```

Tanpa `gh`: buat repo kosong di github.com → `git remote add origin <url>` → `git push -u origin main`.
Hanya folder `web/` yang jadi root repo — file `.txt` dan `Code.gs` di luar repo deploy.

## 3. Sambung Cloudflare Pages (CI/CD otomatis)

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → pilih repo.
2. Build settings: Framework preset = None. Build command = kosong. Output directory = `/` (root).
3. Deploy → dapat `https://<nama>.pages.dev`. Login: `Admin` / `adaptif2025`.
4. CI/CD bawaan: tiap push ke `main` = deploy production. Tiap PR = preview URL otomatis. Tidak perlu GitHub Actions.

## 4. Alur pakai

Login → extractor (`index.html`): tempel transkrip → Analisis → review 53 kolom → ACC & Simpan (tulis baris lengkap ke tab "Lembar Kerja" + baris ringkas 13 kolom ke sheet dashboard) → buka Monitoring untuk lihat grafik + tabel terupdate.
Kuota habis → tombol Analisis dikunci, Isi Manual tetap jalan (tanpa panggil Gemini).

## 5. Mapping simpan ringkas → dashboard

jenisKomoditi→Komoditas, layananMelalui→Sarana, isuTopik→Isu/Topik, Laki-laki→L, Perempuan→P, Alamat=kotaKab||alamat, Reg Id=REG/tahun/NNN dari jumlah baris.

## 5. Batas sadar

- Login gate frontend saja (bypass via devtools mungkin). Naik kelas saat perlu: session via Functions + cookie httpOnly.
- Tanpa LockService di GAS: hit serentak bisa lolos 1–2 request di atas batas.
