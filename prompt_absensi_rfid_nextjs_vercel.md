# Prompt Pengembangan Sistem Absensi RFID ESP32 + Next.js

## Tujuan

Saya sedang membuat sistem absensi siswa menggunakan **ESP32 + RFID RC522** dan aplikasi web menggunakan **Next.js** yang akan di-deploy ke **Vercel**.

Masalah pada sistem lama adalah ESP menggunakan IP address server secara hardcode. Ketika ESP dipindahkan ke jaringan WiFi yang berbeda, IP address berubah sehingga kode ESP harus diubah dan di-upload ulang.

Saya ingin sistem baru yang **tidak bergantung pada IP address lokal yang hardcode**.

---

## Arsitektur yang diinginkan

Gunakan arsitektur:

```text
RFID Card
   ↓
RC522
   ↓
ESP32
   ↓
WiFi
   ↓
Internet
   ↓
Next.js API
   ↓
Database
   ↓
Web Dashboard
```

ESP32 harus mengirim UID kartu RFID ke backend Next.js melalui HTTP/HTTPS API.

Aplikasi Next.js akan di-deploy ke **Vercel**, sehingga ESP32 **tidak perlu mengakses IP lokal komputer/server**.

Contoh:

```text
ESP32
  ↓
https://domain-absensi.vercel.app/api/attendance
```

Jangan menggunakan:

```text
192.168.1.10
192.168.0.10
10.0.0.x
localhost
```

sebagai alamat backend production.

---

# Persyaratan ESP32

## 1. IP ESP32 menggunakan DHCP

ESP32 harus menggunakan konfigurasi WiFi normal:

```cpp
WiFi.begin(ssid, password);
```

Jangan menggunakan static IP.

ESP32 harus menerima IP dari router secara otomatis.

Contoh:

```text
Jaringan A
ESP32 → 192.168.1.20

Jaringan B
ESP32 → 192.168.0.15

Hotspot HP
ESP32 → 192.168.43.10
```

Program ESP32 tidak perlu mengetahui IP lokalnya sendiri untuk mengirim data ke backend.

---

# 2. WiFiManager

Gunakan **WiFiManager** atau mekanisme konfigurasi WiFi yang setara.

Tujuannya agar SSID dan password WiFi tidak perlu di-hardcode dan di-upload ulang setiap kali jaringan berubah.

Alur yang diinginkan:

```text
ESP32 dinyalakan
       ↓
Coba koneksi WiFi tersimpan
       ↓
Berhasil?
   ↓          ↓
  Ya        Tidak
   ↓          ↓
Mulai       Masuk mode konfigurasi
             ↓
        User memilih WiFi
             ↓
        Masukkan password
             ↓
        Simpan konfigurasi
             ↓
        Terhubung ke WiFi
```

Jika WiFi berubah, administrator cukup melakukan konfigurasi ulang melalui halaman konfigurasi ESP32.

---

# 3. Backend tidak menggunakan IP lokal

Karena Next.js akan di-deploy ke Vercel, ESP32 harus menggunakan URL HTTPS production.

Contoh:

```cpp
const char* apiUrl =
  "https://domain-absensi.vercel.app/api/attendance";
```

Namun URL tersebut sebaiknya dibuat mudah dikonfigurasi, misalnya melalui file konfigurasi ESP32 atau mekanisme konfigurasi device.

Jangan membuat URL API bergantung pada:

```text
localhost
127.0.0.1
192.168.x.x
10.x.x.x
```

---

# 4. HTTPS

ESP32 harus mengirim request menggunakan HTTPS ke endpoint Next.js.

Contoh konsep:

```text
POST /api/attendance
```

Payload:

```json
{
  "uid": "A1B2C3D4",
  "deviceId": "ABSEN-01"
}
```

Jika diperlukan, tambahkan:

```json
{
  "uid": "A1B2C3D4",
  "deviceId": "ABSEN-01",
  "timestamp": "2026-09-09T07:30:00+07:00"
}
```

Backend jangan mempercayai timestamp dari ESP32 jika tidak diperlukan. Sebaiknya waktu absensi ditentukan oleh server.

---

# 5. Device ID

Setiap ESP32 harus mempunyai identitas perangkat.

Contoh:

```text
ABSEN-01
ABSEN-02
ABSEN-03
```

atau menggunakan MAC address ESP32 sebagai identifier.

Backend dapat mengetahui absensi berasal dari perangkat mana.

Contoh request:

```json
{
  "uid": "A1B2C3D4",
  "deviceId": "ABSEN-01"
}
```

---

# Persyaratan Next.js

Gunakan:

- Next.js
- TypeScript
- App Router
- API Route / Route Handler
- Prisma jika database menggunakan Prisma
- Database PostgreSQL
- Tailwind CSS untuk UI
- Environment variables untuk konfigurasi rahasia

Contoh endpoint:

```text
POST /api/attendance
```

---

# Database

Buat rancangan database yang minimal mempunyai tabel:

## students

```text
id
nisn
name
classId
rfidUid
isActive
createdAt
updatedAt
```

## attendance

```text
id
studentId
deviceId
attendanceDate
attendanceTime
status
createdAt
```

Jika diperlukan, buat tabel:

## devices

```text
id
deviceId
name
location
apiKey
isActive
createdAt
updatedAt
```

Gunakan relasi database yang benar.

Satu siswa dapat mempunyai banyak data absensi.

Satu device dapat menghasilkan banyak data absensi.

---

# Keamanan API

Jangan hanya mengandalkan UID RFID.

ESP32 harus melakukan autentikasi ke backend.

Gunakan salah satu pendekatan yang sesuai:

```text
API Key per device
```

atau mekanisme autentikasi device yang aman.

Contoh:

```http
Authorization: Bearer DEVICE_API_KEY
```

API key jangan ditampilkan di frontend Next.js.

Jika API key disimpan di ESP32, jelaskan keterbatasan keamanannya karena firmware ESP32 secara teori dapat diekstrak.

Backend harus melakukan:

1. Validasi request
2. Validasi device
3. Validasi UID RFID
4. Cek apakah siswa aktif
5. Cek apakah siswa sudah melakukan absensi pada periode tertentu
6. Simpan data absensi
7. Mengembalikan response JSON yang jelas

---

# Response API

Jika berhasil:

```json
{
  "success": true,
  "message": "Absensi berhasil",
  "data": {
    "studentName": "Budi",
    "uid": "A1B2C3D4",
    "time": "07:30:15"
  }
}
```

Jika UID tidak terdaftar:

```json
{
  "success": false,
  "message": "Kartu RFID tidak terdaftar"
}
```

Jika sudah absen:

```json
{
  "success": false,
  "message": "Siswa sudah melakukan absensi"
}
```

Gunakan HTTP status code yang sesuai.

---

# Fitur ESP32

Setelah kartu RFID ditempelkan:

```text
RFID terbaca
    ↓
Ambil UID
    ↓
Kirim HTTPS POST
    ↓
Next.js memvalidasi
    ↓
Response diterima ESP32
    ↓
LCD menampilkan hasil
```

Contoh LCD:

```text
Scan RFID...
```

Setelah berhasil:

```text
Absensi Berhasil
Budi
X RPL 1
```

Jika gagal:

```text
Kartu Tidak
Terdaftar
```

Jika sudah absen:

```text
Sudah Absen
Budi
```

---

# Offline Handling

Pertimbangkan kondisi ketika internet mati.

ESP32 sebaiknya:

1. Mendeteksi koneksi internet gagal
2. Memberikan informasi pada LCD
3. Tidak menganggap absensi berhasil jika backend belum menerima data
4. Jika memungkinkan, menyimpan antrean absensi sementara di flash/Preferences
5. Mengirim ulang ketika koneksi kembali

Tetapi hindari duplikasi absensi ketika data dikirim ulang.

Gunakan `idempotency key` atau identifier unik untuk setiap event absensi.

Contoh:

```json
{
  "eventId": "ESP32MAC-1746812345-A1B2C3D4",
  "uid": "A1B2C3D4",
  "deviceId": "ABSEN-01"
}
```

Backend harus memastikan event yang sama tidak disimpan dua kali.

---

# Deployment Vercel

Next.js harus dapat berjalan di Vercel.

Gunakan environment variables untuk:

```text
DATABASE_URL
DEVICE_API_SECRET
```

atau konfigurasi yang memang diperlukan.

Jangan memasukkan credential database ke kode frontend atau ESP32.

Jelaskan juga bagian mana yang berjalan:

```text
ESP32
```

dan bagian mana yang berjalan:

```text
Vercel
```

serta bagaimana komunikasi keduanya.

---

# Hal penting tentang jaringan

Jelaskan bahwa setelah backend berada di Vercel:

```text
ESP32 tidak perlu satu jaringan LAN dengan server.
```

Contoh:

```text
ESP32
WiFi sekolah
192.168.1.x
     ↓
Internet
     ↓
Vercel
     ↓
Next.js API
     ↓
PostgreSQL
```

Kemudian ketika dipindahkan:

```text
ESP32
Hotspot HP
192.168.43.x
     ↓
Internet
     ↓
Vercel
     ↓
Next.js API
```

ESP32 tetap menggunakan endpoint API yang sama.

Dengan demikian perubahan IP lokal tidak memengaruhi backend.

---

# Catatan penting

Jangan menyelesaikan masalah hanya dengan DHCP.

DHCP hanya membuat:

```text
IP ESP32 otomatis berubah sesuai jaringan.
```

Tetapi masalah utama sistem lama adalah kemungkinan backend masih menggunakan:

```text
IP lokal server.
```

Karena backend sekarang menggunakan Vercel, gunakan:

```text
HTTPS + domain Vercel
```

sebagai endpoint backend.

Jangan gunakan mDNS seperti:

```text
absensi.local
```

untuk komunikasi ESP32 → Vercel.

mDNS hanya relevan jika ESP32 berkomunikasi dengan server lokal dalam jaringan yang sama.

---

# Output yang saya inginkan

Buat implementasi lengkap dan production-oriented.

Berikan:

## 1. Arsitektur sistem

Jelaskan alur:

```text
RFID → ESP32 → WiFi → Internet → Vercel → Next.js API → Database
```

## 2. Kode ESP32

Gunakan C++ Arduino.

Minimal mencakup:

- WiFiManager
- WiFi connection
- DHCP
- RFID RC522
- HTTPS
- HTTP POST
- JSON
- Device ID
- API authentication
- LCD
- timeout
- retry
- error handling
- offline handling
- duplicate prevention

## 3. Struktur project Next.js

Contoh:

```text
src/
├── app/
│   ├── api/
│   │   └── attendance/
│   │       └── route.ts
│   └── ...
├── lib/
│   ├── prisma.ts
│   └── ...
└── ...
```

Sesuaikan dengan Next.js App Router.

## 4. Prisma Schema

Buat schema Prisma lengkap untuk:

- Student
- Attendance
- Device

Dengan relasi dan index yang diperlukan.

## 5. API Route

Buat:

```text
POST /api/attendance
```

dengan TypeScript.

Harus menggunakan:

- validation
- authentication
- database transaction jika diperlukan
- duplicate prevention
- error handling

## 6. Environment Variables

Berikan contoh:

```env
DATABASE_URL="..."
```

dan jelaskan mana yang boleh berada di client dan mana yang hanya boleh berada di server.

## 7. Vercel Deployment

Jelaskan langkah deployment Next.js ke Vercel.

## 8. Konfigurasi ESP32

Jelaskan bagaimana ESP32 pertama kali dikonfigurasi.

Contoh:

```text
1. ESP32 dinyalakan
2. Tidak menemukan WiFi
3. ESP32 membuat AP
4. HP terhubung
5. Pilih WiFi sekolah
6. Masukkan password
7. ESP32 menyimpan konfigurasi
8. ESP32 terhubung
9. ESP32 mulai membaca RFID
```

## 9. Penjelasan sederhana

Jelaskan setiap bagian kode dengan bahasa yang mudah dipahami.

Gunakan analogi jika membantu.

Contoh analogi:

```text
IP ESP32 = alamat rumah sementara
API domain = alamat kantor tetap
```

Jelaskan kenapa sistem baru tidak perlu mengetahui IP lokal server.

---

# Prinsip utama

Prioritaskan:

1. Tidak ada hardcode IP lokal server
2. ESP32 menggunakan DHCP
3. WiFi mudah dikonfigurasi
4. Backend menggunakan HTTPS
5. Backend menggunakan domain Vercel
6. API aman
7. Database aman
8. Tidak terjadi duplicate attendance
9. Bisa menangani koneksi internet terputus
10. Struktur kode mudah dikembangkan

Jika ada bagian dari rancangan yang kurang tepat untuk Vercel, ESP32, atau PostgreSQL, jelaskan masalahnya dan berikan solusi yang lebih tepat.

Jangan hanya memberikan konsep. Berikan implementasi kode yang dapat dijadikan dasar project nyata.
