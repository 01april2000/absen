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
 *  Untuk ubah konfigurasi lagi: tombol RESET ditekan lama (GPIO reset).
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

// LCD 16x2 I2C (alamat 0x27 atau 0x3F — coba ganti jika blank)
#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2

// RC522 via SPI (SPI class milik ESP32 sudah menyediakan GPIO 18/19/23)
#define RST_PIN 4   // Wemos D4
#define SS_PIN  5   // Wemos D8

MFRC522 rc522(SS_PIN, RST_PIN);

// Label default tampilan dari WiFiManager undangan
const char* WM_AP_NAME = "Absensi-Config";

// Parameter custom WiFiManager (disimpan di NVS oleh library)
WiFiManagerParameter customApiUrl("apiUrl", "API URL (https://.../api/attendance)", "", 160);
WiFiManagerParameter customDeviceId("deviceId", "Device ID (contoh: ABSEN-01)", "ABSEN-01", 40);
WiFiManagerParameter customApiKey("apiKey", "API Key (dari admin)", "", 80);

// NVS (flash) untuk menyimpan konfigurasi & antrean offline
Preferences prefs;

// Batas & waktu
#define HTTP_TIMEOUT_MS  10000     // timeout tiap request
#define MAX_RETRY        3         // percobaan kirim saat online
#define DEBOUNCE_MS      5000      // abaikan kartu sama dalam 5 detik
#define DISPLAY_MS       3000      // lama pesan LCD ditampilkan
#define QUEUE_MAX        20        // maks antrean offline
#define Q_NAMESPACE      "absenq"  // namespace Preferences utk antrean

// Variabel runtime
String apiUrl   = "";
String deviceId = "";
String apiKey   = "";
String lastUid  = "";
unsigned long lastTapMs = 0;
unsigned long lastMsgMs = 0;

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
}

void loadConfig() {
  apiUrl   = prefs.getString("apiUrl", "");
  deviceId = prefs.getString("deviceId", "ABSEN-01");
  apiKey   = prefs.getString("apiKey", "");
  eventSeq = prefs.getUInt("seq", 0);
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
 *  WIFIMANAGER SETUP
 * ============================================================ */

void setupWifi() {
  WiFi.mode(WIFI_STA);

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);        // portal otomatis tutup setelah 3 menit
  wm.setSaveConfigCallback([]() {
    // Ambil nilai parameter custom setelah user menekan Save
    apiUrl   = String(customApiUrl.getValue());
    deviceId = String(customDeviceId.getValue());
    apiKey   = String(customApiKey.getValue());
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
    // 3 menit tanpa input -> reset device agar dicoba lagi
    ESP.restart();
  }

  // Jika API URL kosong (belum pernah diisi lewat portal), isi default
  if (apiUrl.isEmpty()) {
    apiUrl = "http://localhost:3000/api/attendance";
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

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // NVS
  prefs.begin(Q_NAMESPACE, false);
  loadConfig();

  // LCD
  Wire.begin(21, 22);  // SDA=GPIO21 (D2), SCL=GPIO22 (D1)
  lcd.init();
  lcd.backlight();
  lcdPrint("Menyala...", "WiFiManager...");

  // WiFi (WiFiManager)
  setupWifi();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // RC522
  SPI.begin();        // SPI default ESP32: SCK=18, MISO=19, MOSI=23
  rc522.PCD_Init();
  rc522.PCD_PerformSelfTest();  // dipanggil sekali utk cek modul (hasil lewat bitAntennaAmpReg)
  rc522.PCD_AntennaOn();

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