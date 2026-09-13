/*
 * ============================================================
 *  Sistem Absensi RFID - Wemos D1 R32 (ESP32)
 * ============================================================
 *  Device  : Wemos D1 R32 (ESP32, form factor Arduino Uno)
 *  Sensor  : RFID RC522 (SPI)
 *  Display : LCD 16x2 I2C
 *
 *  Alur:
 *    RFID Card -> RC522 -> ESP32 -> WiFi -> Internet ->
 *    https://<app>.vercel.app/api/attendance -> Database
 *
 * ------------------------------------------------------------
 *  WIRING (hubungkan sesuai tabel):
 * ------------------------------------------------------------
 *  LCD 16x2 I2C:
 *    LCD VCC  -> Wemos 3V3
 *    LCD GND  -> Wemos GND
 *    LCD SDA  -> Wemos D2  (GPIO 21)
 *    LCD SCL  -> Wemos D1  (GPIO 22)
 *
 *  RFID RC522:
 *    RC522 3.3V -> Wemos 3V3    (JANGAN 5V!)
 *    RC522 GND  -> Wemos GND
 *    RC522 RST  -> Wemos D4   (GPIO 4)
 *    RC522 SDA  -> Wemos D8   (GPIO 5)  <- SS pin SPI
 *    RC522 MOSI -> Wemos D7   (GPIO 23)
 *    RC522 MISO -> Wemos D6   (GPIO 19)
 *    RC522 SCK  -> Wemos D5   (GPIO 18)
 *    RC522 IRQ  -> tidak dihubungkan
 *
 *  Catatan pin:
 *    - Jika RST bentrok, alternatif: GPIO 0 (pin D3) atau GPIO 2.
 *    - Pastikan RC522 dicolok ke 3.3V (bukan 5V) agar tidak rusak.
 * ------------------------------------------------------------
 *  LIBRARY (Arduino IDE -> Tools -> Manage Libraries):
 *    1. WiFiManager          oleh tablatronix / tzapu  (>= 2.0.16)
 *    2. MFRC522              oleh Miguel Balboa
 *    3. LiquidCrystal I2C    oleh Frank de Brabander
 *    4. ArduinoJson          oleh Benoit Blanchon
 *
 *  BOARD (Tools -> Board):
 *    esp32 -> Wemos D1 R32   (atau "ESP32 Dev Module")
 * ------------------------------------------------------------
 *  KONFIGURASI PERTAMA KALI (captive portal):
 *    1. Nyalakan Wemos. Tidak ada WiFi tersimpan -> buat AP otomatis.
 *    2. HP/komputer connect ke WiFi "Absensi-Config".
 *    3. Buka portal (biasanya otomatis muncul, atau buka http://192.168.4.1).
 *    4. Isi: nama WiFi (SSID), password, API URL, Device ID, API Key.
 *    5. Save -> Wemos reboot, connect WiFi, mulai baca RFID.
 *  Untuk ubah konfigurasi lagi: tahan tombol BOOT (GPIO0) 3 detik
 *  setelah LCD menyala, Wemos akan reset konfigurasi lalu restart ->
 *  portal "Absensi-Config" muncul lagi. (JANGAN tahan BOOT sambil
 *  menekan tombol RESET, itu masuk mode download/flash.)
 *
 *  Jika kolom API URL/API Key di portal tidak bisa diketik (karena
 *  autofill captive portal HP), pakai SERIAL MONITOR:
 *  ketik "CFG" + Enter, lalu isi per baris:
 *    URL:<api url>   DEV:<device id>   KEY:<api key>
 *    SAVE (simpan & restart)  atau  EXIT (batal)
 * ------------------------------------------------------------
 *  API YANG DIPANGGIL:
 *    POST <API_URL>
 *    Header:
 *      Content-Type: application/json
 *      Authorization: Bearer <API_KEY>
 *    Body:
 *      {
 *        "eventId": "<MACHEX>_<seq>_<UID>",
 *        "uid": "A1B2C3D4",
 *        "deviceId": "ABSEN-01"
 *      }
 *    Response sukses:
 *      { "success": true, "message": "...",
 *        "data": { "studentName": "Budi", ... } }
 * ------------------------------------------------------------
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>

/* ============================================================
 *  KONSTANTA & PIN
 * ============================================================ */

// LED onboard Wemos D1 R32 (indikator proses, opsional)
#define LED_PIN 2

// Tombol BOOT onboard (GPIO0, aktif-LOW) utk reset konfigurasi.
// Tahan 3 detik sats loop berjalan -> hapus WiFi+config -> restart.
#define CONFIG_BTN_PIN 0
#define RESET_HOLD_MS 3000

// LCD 16x2 I2C (alamat 0x27 atau 0x3F — coba ganti jika blank)
#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2

// RC522 via SPI (SPI class milik ESP32 sudah menyediakan GPIO 18/19/23)
#define RST_PIN 4  // Wemos D4
#define SS_PIN 5   // Wemos D8

MFRC522 rc522(SS_PIN, RST_PIN);

// Label default tampilan dari WiFiManager undangan
const char* WM_AP_NAME = "Absensi-Config";

// Paksa skema warna terang pada halaman portal WiFiManager.
// Mencegah teks input tak terlihat saat HP dalam mode gelap
// (bug umum WiFiManager 2.x: label tampak tapi ketikan tak terlihat,
// karena browser WebKit mengecat teks input via -webkit-text-fill-color).
// Ditambah script yang menyetel warna secara eksplisit setelah halaman
// dimuat, jadi hasilnya konsisten di Chrome/Edge/Safari.
const char* WM_HEAD_LIGHT =
  "<meta name='color-scheme' content='light'>"
  "<style>"
  "html,body{background:#fff!important;color:#000!important;color-scheme:light}"
  "input,select,textarea{color:#000!important;-webkit-text-fill-color:#000!important;"
  "caret-color:#000!important;background:#fff!important;color-scheme:light;"
  "border:1px solid #999;}"
  "</style>"
  "<script>"
  "window.addEventListener('load',function(){"
  "var f=document.querySelectorAll('form');"
  "for(var j=0;j<f.length;j++)f[j].setAttribute('autocomplete','off');"
  "var e=document.querySelectorAll('input');"
  "for(var i=0;i<e.length;i++){"
  "e[i].style.color='#000';e[i].style.webkitTextFillColor='#000';"
  "e[i].style.caretColor='#000';e[i].style.background='#fff';"
  "}"
  "});"
  "</script>";

// Parameter custom WiFiManager (disimpan di NVS oleh library).
// CATATAN: nama field (arg pertama) sengaja dibuat NETRAL ("endpt",
// "devid", "sig") BUKAN "apiUrl"/"apiKey". Browser (Chrome/Android,
// captive portal) mengambil alih input yang namanya mengandung "url",
// "key", "password" utk autofill sehingga KEYBOARD TIDAK BISA DIPAKAI.
// Autocomplete/autocapitalize dimatikan supaya ketikan normal.
WiFiManagerParameter customApiUrl("endpt", "API URL (https://.../api/attendance)", "", 160,
                                  "type='text' size='34' autocomplete='off' autocorrect='off' "
                                  "autocapitalize='none' spellcheck='false' "
                                  "data-form-type='other' data-lpignore='true'");
WiFiManagerParameter customDeviceId("devid", "Device ID (contoh: ABSEN-01)", "ABSEN-01", 40,
                                    "type='text' size='34' autocomplete='off' autocorrect='off' "
                                    "autocapitalize='none' spellcheck='false' "
                                    "data-form-type='other' data-lpignore='true'");
WiFiManagerParameter customApiKey("sig", "API Key (dari admin)", "absen_affe7824221346798f8552e0eb7ce1e3", 80,
                                  "type='text' size='34' autocomplete='off' autocorrect='off' "
                                  "autocapitalize='none' spellcheck='false' "
                                  "data-form-type='other' data-lpignore='true'");

// NVS (flash) untuk menyimpan konfigurasi & antrean offline
Preferences prefs;

// Batas & waktu
#define HTTP_TIMEOUT_MS 10000  // timeout tiap request
#define MAX_RETRY 3            // percobaan kirim saat online
#define DEBOUNCE_MS 5000       // abaikan kartu sama dalam 5 detik
#define DISPLAY_MS 3000        // lama pesan LCD ditampilkan
#define QUEUE_MAX 20           // maks antrean offline
#define Q_NAMESPACE "absenq"   // namespace Preferences utk antrean
#define SERIAL_IDLE_MS 400     // jika sudah lama tanpa ketikan, proses baris walau tak ada Enter

// Variabel runtime
String apiUrl = "";
String deviceId = "";
String apiKey = "";
String wifiSsid = "";
String wifiPass = "";
String lastUid = "";
unsigned long lastTapMs = 0;
unsigned long lastMsgMs = 0;
unsigned long btnPressMs = 0;
String serialCfgBuf = "";
unsigned long serialLastByteMs = 0;

// Sequence counter unik lintas reboot (disimpan di NVS)
uint32_t eventSeq = 0;

/* ============================================================
 *  LCD HELPER
 * ============================================================ */
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

void lcdClear() {
  lcd.clear();
}

void lcdPrint(const String& line1, const String& line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, LCD_COLS));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, LCD_COLS));
  lastMsgMs = millis();
}

/* ============================================================
 *  NVS: KONFIGURASI & ANTREAN
 * ============================================================ */

void saveConfig() {
  prefs.putString("apiUrl", apiUrl);
  prefs.putString("deviceId", deviceId);
  prefs.putString("apiKey", apiKey);
  prefs.putString("wifiSsid", wifiSsid);
  prefs.putString("wifiPass", wifiPass);
}

void loadConfig() {
  apiUrl = prefs.getString("apiUrl", "");
  deviceId = prefs.getString("deviceId", "ABSEN-01");
  apiKey = prefs.getString("apiKey", "");
  wifiSsid = prefs.getString("wifiSsid", "");
  wifiPass = prefs.getString("wifiPass", "");
  eventSeq = prefs.getUInt("seq", 0);
}

/* ============================================================
 *  SERIAL CONFIG (alternatif andal saat portal HP bermasalah)
 *  Ketik "CFG" (tanpa tanda kutip) di Serial Monitor lalu Enter.
 *  Setelah itu isi per baris:
 *    URL:<api url>       DEV:<device id>       KEY:<api key>
 *    SSID:<nama wifi>    PASS:<password wifi>
 *    SAVE   -> simpan & restart
 *    EXIT   -> batal
 *  WiFi (SSID/PASS) BISA diatur lewat sini — tidak wajib lewat portal.
 * ============================================================ */

// Proses satu baris perintah config. Mengembalikan true jika harus
// KELUAR dari serialConfigure (perintah EXIT). SAVE langsung restart.
bool handleConfigLine(String line) {
  line.trim();
  if (line.length() == 0) return false;

  if (line.startsWith("URL:")) {
    apiUrl = line.substring(4);
    apiUrl.trim();
    saveConfig();
    Serial.println("Oke. URL diset.");
    lcdPrint("URL", apiUrl.substring(0, 14));
  } else if (line.startsWith("DEV:")) {
    deviceId = line.substring(4);
    deviceId.trim();
    saveConfig();
    Serial.println("Oke. DEV diset.");
    lcdPrint("Device ID", deviceId.substring(0, 14));
  } else if (line.startsWith("KEY:")) {
    apiKey = line.substring(4);
    apiKey.trim();
    saveConfig();
    Serial.println("Oke. KEY diset.");
    lcdPrint("API Key", apiKey.substring(0, 14) + "..");
  } else if (line.startsWith("SSID:")) {
    wifiSsid = line.substring(5);
    wifiSsid.trim();
    saveConfig();
    Serial.println("Oke. SSID diset.");
    lcdPrint("WiFi SSID", wifiSsid.substring(0, 14));
  } else if (line.startsWith("PASS:")) {
    wifiPass = line.substring(5);
    wifiPass.trim();
    saveConfig();
    Serial.println("Oke. PASS diset.");
    lcdPrint("WiFi PASS", "Tersimpan..");
  } else if (line.equalsIgnoreCase("SAVE")) {
    if (apiUrl.isEmpty()) apiUrl = "https://absen-azure.vercel.app/api/attendance";
    saveConfig();
    Serial.println("Tersimpan. Restart...");
    lcdPrint("Tersimpan", "Restart...");
    delay(1500);
    ESP.restart();
  } else if (line.equalsIgnoreCase("EXIT")) {
    Serial.println("Batal. Kembali ke operasi normal.");
    lcdPrint("Batal", "Lanjut Normal");
    delay(1000);
    return true;
  } else {
    Serial.println("Perintah tak dikenal. Pakai URL:/DEV:/KEY:/SSID:/PASS:/SAVE/EXIT");
  }
  return false;
}

void serialConfigure() {
  lcdPrint("Serial Config", "URL DEV KEY WI");
  Serial.println();
  Serial.println("=== SERIAL CONFIG ===");
  Serial.println("Kirim per baris lalu Enter:");
  Serial.println("  URL:<api url>");
  Serial.println("  DEV:<device id>");
  Serial.println("  KEY:<api key>");
  Serial.println("  SSID:<nama wifi>");
  Serial.println("  PASS:<password wifi>");
  Serial.println("  SAVE  -> simpan & restart");
  Serial.println("  EXIT  -> batal tanpa simpan");
  String buf = "";
  unsigned long lastByteMs = 0;
  while (true) {
    while (Serial.available()) {
      char c = (char)Serial.read();
      if (c == '\n' || c == '\r') {
        lastByteMs = 0;
        String line = buf;
        buf = "";
        if (handleConfigLine(line)) return;
      } else {
        buf += c;
        lastByteMs = millis();
      }
    }
    // Proses baris meski tanpa Enter (mis. paste teks di monitor non-Arduino)
    if (buf.length() > 0 && lastByteMs != 0 && (millis() - lastByteMs) > SERIAL_IDLE_MS) {
      String line = buf;
      buf = "";
      lastByteMs = 0;
      if (handleConfigLine(line)) return;
    }
    delay(20);
  }
}

// --- Antrean offline (event sementara jika internet mati) ---
int queueCount() {
  return prefs.getInt("count", 0);
}

// Dapatkan item antrean index ke-i
String queueGet(int i) {
  return prefs.getString(("q_" + String(i)).c_str(), "");
}

// Simpan payload ke antrean (return false jika penuh)
bool queuePush(const String& payload) {
  int n = queueCount();
  if (n >= QUEUE_MAX) return false;
  prefs.putString(("q_" + String(n)).c_str(), payload);
  prefs.putInt("count", n + 1);
  return true;
}

// Hapus item index ke-0 (sudah berhasil dikirim / dibuang) dan geser sisanya
void queueShift() {
  int n = queueCount();
  if (n <= 0) return;
  for (int i = 0; i < n - 1; i++) {
    prefs.putString(("q_" + String(i)).c_str(), queueGet(i + 1));
  }
  prefs.remove(("q_" + String(n - 1)).c_str());
  prefs.putInt("count", n - 1);
}

void queueClear() {
  int n = queueCount();
  for (int i = 0; i < n; i++) {
    prefs.remove(("q_" + String(i)).c_str());
  }
  prefs.putInt("count", 0);
}

/* ============================================================
 *  RESET KONFIGURASI (tombol BOOT tahan 3 detik)
 *  Hanya dicek di dalam loop(), bukan saat boot, supaya tidak
 *  bertabrakan dengan mode download/flash ESP32 (GPIO0 low saat
 *  reset = masuk mode flashing).
 * ============================================================ */

void checkConfigResetButton() {
  if (digitalRead(CONFIG_BTN_PIN) == LOW) {
    if (btnPressMs == 0) btnPressMs = millis();
    if (millis() - btnPressMs >= RESET_HOLD_MS) {
      WiFiManager wm;
      wm.resetSettings();  // hapus SSID/password WiFi tersimpan
      prefs.clear();       // hapus apiUrl/deviceId/apiKey + antrean
      lcdPrint("Konfigurasi", "Direset...");
      delay(1500);
      ESP.restart();  // boot ulang -> portal Absensi-Config muncul
    }
  } else {
    btnPressMs = 0;
  }
}

/* ============================================================
 *  WIFIMANAGER SETUP
 * ============================================================ */

void setupWifi() {
  WiFi.mode(WIFI_STA);

  // Jika SSID+password disimpan via "CFG" (serial), coba sambung LANGSUNG
  // tanpa portal. Berguna saat captive portal di HP susah dipakai.
  if (!wifiSsid.isEmpty()) {
    Serial.printf("WiFi: menyambung ke '%s' (config serial)...\n", wifiSsid.c_str());
    WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 20000) {
      delay(200);
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("WiFi tersambung (config serial).");
      return;
    }
    Serial.println("WiFi gagal konek pakai config serial. Buka portal...");
  }

  WiFiManager wm;

  // Sisipkan CSS pemaksa skema terang agar teks input selalu terlihat
  // (terutama saat portal dibuka dari HP dalam mode gelap).
  wm.setCustomHeadElement(WM_HEAD_LIGHT);

  wm.setConfigPortalTimeout(180);  // portal otomatis tutup setelah 3 menit
  wm.setSaveConfigCallback([]() {
    // Ambil nilai parameter custom setelah user menekan Save
    apiUrl = String(customApiUrl.getValue());
    deviceId = String(customDeviceId.getValue());
    apiKey = String(customApiKey.getValue());
    saveConfig();
  });

  // Tambahkan field tambahan di halaman config portal
  wm.addParameter(&customApiUrl);
  wm.addParameter(&customDeviceId);
  wm.addParameter(&customApiKey);

  // Muat nilai tersimpan supaya field terprefilled (jika Field ini pernah diisi)
  customApiUrl.setValue(apiUrl.c_str(), apiUrl.length());
  customDeviceId.setValue(deviceId.c_str(), deviceId.length());
  customApiKey.setValue(apiKey.c_str(), apiKey.length());

  // Coba connect dari SSID tersimpan; jika gagal -> buat AP "Absensi-Config"
  if (!wm.autoConnect(WM_AP_NAME)) {
    // Portal habis tanpa input -> reset device agar dicoba lagi
    ESP.restart();
  }

  // Simpan SSID/password yang berhasil diconnect portal utk boot berikutnya,
  // jadi ke depannya tidak perlu portal lagi.
  wifiSsid = WiFi.SSID();
  wifiPass = WiFi.psk();
  saveConfig();

  // Jika API URL kosong (belum pernah diisi lewat portal), isi default
  if (apiUrl.isEmpty()) {
    apiUrl = "https://absen-azure.vercel.app/api/attendance";
    saveConfig();
  }
}

/* ============================================================
 *  BACA UID RC522 -> HEX UPPERCASE
 * ============================================================ */

String uidToString(const byte* buffer, byte size) {
  String uid = "";
  for (byte i = 0; i < size; i++) {
    if (buffer[i] < 0x10) uid += "0";
    uid += String(buffer[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

/* ============================================================
 *  HTTPS POST & ANTREAN OFFLINE
 * ============================================================ */

// Kirim payload ke backend. Jika semua retry gagal karena jaringan,
// status diisi 0 supaya pemanggil bisa men-queue.
// Catatan: gunakan parameter output (bukan return struct) karena
// Arduino IDE membuat prototype fungsi di awal file sebelum tipe
// custom seperti struct dikenal.
void sendAttendance(const String& payload, int& status, String& body) {
  status = 0;
  body = "";

  if (apiUrl.isEmpty() || apiKey.isEmpty()) {
    body = "missing_config";
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();  // tanpa validasi sertifikat (praktis utk produksi sendiri)

  for (int attempt = 1; attempt <= MAX_RETRY; attempt++) {
    HTTPClient http;
    http.begin(client, apiUrl.c_str());
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + apiKey);

    int code = http.POST(payload);

    if (code > 0) {
      status = code;
      body = http.getString();
      http.end();
      return;  // server merespons -> stop retry
    }

    http.end();
    delay(500);  // jeda antar percobaan
  }

  // Semua percobaan gagal (code == -1 dll) -> jaringan/internet/bad
}

// kirim ulang seluruh antrean yg tersimpan; return jumlah sukses
int flushQueue() {
  int sent = 0;
  int attempts = 0;
  while (queueCount() > 0 && attempts < QUEUE_MAX) {
    attempts++;
    String payload = queueGet(0);
    int status = 0;
    String body;
    sendAttendance(payload, status, body);
    if (status > 0) {
      queueShift();
      sent++;
    } else {
      break;  // masih offline -> berhenti, tunggu loop berikutnya
    }
  }
  return sent;
}

/* ============================================================
 *  PROSES SATU KARTU
 * ============================================================ */

void processCard(String uid) {
  // Buat eventId unik: <MACHEX>_<seq>_<UID>
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  eventSeq++;
  prefs.putUInt("seq", eventSeq);
  String eventId = mac + "_" + String(eventSeq) + "_" + uid;

  // Payload
  JsonDocument doc;
  doc["eventId"] = eventId;
  doc["uid"] = uid;
  doc["deviceId"] = deviceId;
  String payload;
  serializeJson(doc, payload);

  // Indikator proses
  digitalWrite(LED_PIN, HIGH);

  int status = 0;
  String respBody;
  sendAttendance(payload, status, respBody);

  if (status == 0) {
    // Jaringan bermasalah / tidak ada internet -> simpan ke antrean
    if (queuePush(payload)) {
      lcdPrint("No Internet", "Data Disimpan");
    } else {
      lcdPrint("Antrean Penuh", "Hubungi Admin");
    }
    digitalWrite(LED_PIN, LOW);
    return;
  }

  // Parse response JSON
  JsonDocument resp;
  DeserializationError err = deserializeJson(resp, respBody.c_str());
  String name = resp["data"]["studentName"] | "";
  String className = resp["data"]["className"] | "";
  if (name.isEmpty()) {
    name = resp["data"]["name"] | "";
  }

  if (status >= 200 && status < 300 && (resp["success"] | false)) {
    String line1 = "Absensi OK";
    String line2 = name;
    if (!className.isEmpty() && name.length() + className.length() + 1 <= LCD_COLS) {
      line2 = name + " " + className;
    }
    lcdPrint(line1, line2);
  } else if (status == 401 || status == 403) {
    lcdPrint("Akses Ditolak", "Device Tak Aktif");
  } else {
    // Backend menjawab tapi gagal (kartu tidak terdaftar / sudah absen dll.)
    String msg = resp["message"] | "";
    String line1, line2;
    if (msg.length() > 0) {
      line1 = msg.substring(0, LCD_COLS);
      if (msg.length() > LCD_COLS) {
        line2 = msg.substring(LCD_COLS, LCD_COLS * 2);
      } else if (name.length() > 0) {
        line2 = name.substring(0, LCD_COLS);
      }
    } else {
      line1 = name.length() > 0 ? name : "Respons Gagal";
      line2 = "Coba Lagi";
    }
    lcdPrint(line1, line2);
  }

  digitalWrite(LED_PIN, LOW);
}

/* ============================================================
 *  SETUP
 * ============================================================ */

void setup() {
  Serial.begin(115200);
  Serial.println("=== ABSENSI RFID START ===");
  Serial.println("Serial Monitor: 115200 baud. Line Ending: 'Newline' atau 'Both NL & CR'.");
  Serial.println("Ketik 'CFG' lalu Enter untuk ubah konfigurasi (URL:/DEV:/KEY:/SSID:/PASS:/SAVE).");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(CONFIG_BTN_PIN, INPUT_PULLUP);

  // NVS
  prefs.begin(Q_NAMESPACE, false);
  loadConfig();

  // Bersihkan buffer serial dari sampah sisa boot/UART noise
  serialCfgBuf = "";
  serialLastByteMs = 0;
  while (Serial.available()) Serial.read();

  // LCD
  Wire.begin(21, 22);  // SDA=GPIO21 (D2), SCL=GPIO22 (D1)
  lcd.init();
  lcd.backlight();
  lcdPrint("Menyala...", "WiFiManager...");

  // Jika belum ada WiFi tersimpan, loop() tidak akan pernah sempat memproses
  // "CFG" (setupWifi() membuka portal lama lalu restart). Karena itu beri
  // jendela input serial di sini supaya SSID/PASS/URL/DEV/KEY bisa diisi
  // langsung dari Serial Monitor tanpa perlu portal.
  if (wifiSsid.isEmpty()) {
    Serial.println("Belum ada WiFi tersimpan. Pilih salah satu:");
    Serial.println("  (1) Isi lewat serial, mis. ketik: SSID:nama_wifi  lalu  PASS:password  lalu  SAVE");
    Serial.println("  (2) Tunggu AP 'Absensi-Config' lalu isi lewat portal (http://192.168.4.1).");
    Serial.println("Menunggu input serial 25 detik...");
    String buf = "";
    unsigned long lastByteMs = 0;
    unsigned long t0 = millis();
    bool exited = false;
    while (!exited && (millis() - t0) < 25000) {
      while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
          lastByteMs = 0;
          String line = buf;
          buf = "";
          line.trim();
          if (line.equalsIgnoreCase("CFG")) {
            serialConfigure();  // menu penuh; ketik EXIT utk lanjut boot
          } else if (handleConfigLine(line)) {
            exited = true;
            break;
          }
        } else {
          buf += c;
          lastByteMs = millis();
        }
      }
      if (!exited && buf.length() > 0 && lastByteMs != 0 && (millis() - lastByteMs) > SERIAL_IDLE_MS) {
        String line = buf;
        buf = "";
        lastByteMs = 0;
        line.trim();
        if (line.equalsIgnoreCase("CFG")) {
          serialConfigure();
        } else if (handleConfigLine(line)) {
          exited = true;
        }
      }
      delay(20);
    }
  }

  // WiFi (WiFiManager). Jika config serial sudah menyediakan SSID/PASS,
  // setupWifi() menyambungkan langsung; jika tidak, portal dibuka.
  Serial.println("WiFi: mencoba koneksi...");
  setupWifi();
  Serial.print("WiFi OK, IP: ");
  Serial.println(WiFi.localIP());

  // RC522
  SPI.begin();  // SPI default ESP32: SCK=18, MISO=19, MOSI=23
  rc522.PCD_Init();
  // JANGAN pakai rc522.PCD_PerformSelfTest() di sini: pada banyak modul (dan
  // kloningan), self-test membuat reader keluar dari mode baca dan kartu tidak
  // terdeteksi lagi sampai di-init ulang. Pakai urutan standar sebagai ganti.
  rc522.PCD_SetAntennaGain(rc522.RxGain_max);  // maksimalkan antena (kloningan sering lemah)
  rc522.PCD_AntennaOn();
  // Diagnostik: cek byte versi firmware lewat Serial Monitor (115200 baud).
  // 0x92/0x95/0x96/0x97 = MFRC522 normal => SPI & wiring benar.
  // 0x00/0xFF/garbage    => kabel SPI belum benar (cek SDA/SCK/MOSI/MISO/RST).
  rc522.PCD_DumpVersionToSerial();

  // Coba kirim ulang antrean offline dari sesi sebelumnya
  int sent = flushQueue();
  if (sent > 0) {
    Serial.printf("Antrean dikirim ulang: %d\n", sent);
  } else if (queueCount() > 0) {
    lcdPrint("Offline - Ada", "Antrean Tersimpan");
    delay(DISPLAY_MS);
  }

  lcdPrint("Tempel Kartu", "Absensi RFID..");
  lastMsgMs = millis();
}

/* ============================================================
 *  LOOP
 * ============================================================ */

void loop() {
  // 0) Reset konfigurasi via tombol BOOT tahan 3 detik (dicek duluan)
  checkConfigResetButton();

  // 0b) Konfigurasi via Serial Monitor: ketik "CFG" lalu Enter.
  //     Baris diakumulasi lintas iterasi supaya tidak rawan terpotong.
  while (Serial.available()) {
    char c = (char)Serial.read();
    // Terminator boleh '\n' ATAU '\r' supaya semua mode Line Ending Serial
    // Monitor jalan: "Newline", "Carriage return", maupun "Both NL & CR".
    if (c == '\n' || c == '\r') {
      serialLastByteMs = 0;
      String line = serialCfgBuf;
      serialCfgBuf = "";
      line.trim();
      if (line.equalsIgnoreCase("CFG")) {
        serialConfigure();
      }
    } else {
      serialCfgBuf += c;
      serialLastByteMs = millis();
    }
  }

  // Jeda ketikan (tanpa Enter): banyak Serial Monitor lain mengirim teks tanpa
  // newline, atau pengguna lupa Enter. Setelah SERIAL_IDLE_MS tanpa karakter
  // baru, proses baris yang sudah terkumpul.
  if (serialCfgBuf.length() > 0 && serialLastByteMs != 0 && (millis() - serialLastByteMs) > SERIAL_IDLE_MS) {
    String line = serialCfgBuf;
    serialCfgBuf = "";
    serialLastByteMs = 0;
    line.trim();
    if (line.equalsIgnoreCase("CFG")) {
      serialConfigure();
    }
  }

  // 1) Jika ada antrean & online -> coba kirim ulang secara berkala
  if (queueCount() > 0 && WiFi.status() == WL_CONNECTED) {
    String ip = WiFi.localIP().toString();
    Serial.printf("Flush antrean (%d item), ip=%s\n", queueCount(), ip.c_str());
    int sent = flushQueue();
    if (sent > 0) {
      lcdPrint("Sinkron OK", String(sent) + " data terkirim");
    }
    delay(300);
  }

  // 2) Baca kartu RFID
  if (rc522.PICC_IsNewCardPresent() && rc522.PICC_ReadCardSerial()) {
    String uid = uidToString(rc522.uid.uidByte, rc522.uid.size);

    // Debounce: proses hanya jika UID berbeda, atau UID sama tapi sudah lewat
    // DEBOUNCE_MS (mis. kartu sengaja tertempel, diabaikan bila dipindai 2x cepat)
    if (uid != lastUid || (millis() - lastTapMs) > DEBOUNCE_MS) {
      lastUid = uid;
      lastTapMs = millis();
      Serial.print("Card UID: ");
      Serial.println(uid);
      processCard(uid);
    }
    rc522.PICC_HaltA();
    rc522.PCD_StopCrypto1();
  }

  // 3) Kembalikan tampilan ke "Tempel Kartu" setelah beberapa saat
  if (lastMsgMs && (millis() - lastMsgMs) > DISPLAY_MS) {
    lcdPrint("Tempel Kartu", "Absensi RFID..");
    lastMsgMs = millis();
  }

  delay(50);
}