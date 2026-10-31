/* Task 4.2 - Forge firmware (sensors + relay + Firebase)
   Every 2 seconds the ESP32:
     1. reads the controls from Firebase  (bulb, mode, threshold)
     2. reads the DHT11 and the averaged LDR
     3. switches the relay (manual = follow the dashboard toggle, auto = light vs threshold)
     4. writes one reading (temperature, humidity, light, relay) keyed by its timestamp
   If WiFi or Firebase is lost, the relay falls back to OFF. */

#include <WiFi.h>
#include <time.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>

// ---------- fill these in ----------
#define WIFI_SSID       "YOUR_WIFI_NAME"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
#define API_KEY         "YOUR_FIREBASE_WEB_API_KEY"
#define DATABASE_URL    "https://YOUR-PROJECT-default-rtdb.firebaseio.com"
#define DEVICE_EMAIL    "YOUR_DEVICE_EMAIL"        // the second user you created for the ESP32
#define DEVICE_PASSWORD "YOUR_DEVICE_PASSWORD"
#define OWNER_UID       "YOUR_OWN_USER_UID"        // the UID of YOUR account (the dashboard login)
// -----------------------------------

const int DHT_PIN   = 4;
const int LDR_PIN   = 34;
const int RELAY_PIN = 26;
const int RELAY_ON  = LOW;               // swap if your relay module is the opposite
const int RELAY_OFF = HIGH;

const int SAMPLES               = 15;    // light readings averaged into one value
const int SAMPLE_GAP_MS         = 8;
const unsigned long CYCLE_MS    = 2000;  // one reading every 2 s = 43,200 a day

DHT dht(DHT_PIN, DHT11);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String base = String("/users/") + OWNER_UID;   // everything lives under your own user id
bool   bulbWanted = false;                     // the dashboard toggle
String mode       = "manual";                  // "manual" or "auto"
int    threshold  = 2000;                      // 0-4095
bool   relayOn    = false;
unsigned long lastCycle = 0;

void setRelay(bool on) {
  relayOn = on;
  digitalWrite(RELAY_PIN, on ? RELAY_ON : RELAY_OFF);
}

int readLight() {
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(LDR_PIN);
    delay(SAMPLE_GAP_MS);
  }
  return sum / SAMPLES;
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
}

void setup() {
  Serial.begin(115200);
  digitalWrite(RELAY_PIN, RELAY_OFF);      // safe OFF from the very first moment
  pinMode(RELAY_PIN, OUTPUT);
  dht.begin();

  connectWiFi();

  // The reading's key is the current time, so the clock must be right first.
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Syncing the clock");
  while (time(nullptr) < 1700000000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  config.api_key      = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email     = DEVICE_EMAIL;
  auth.user.password  = DEVICE_PASSWORD;
  config.token_status_callback = tokenStatusCallback;   // prints sign-in progress
  Firebase.reconnectWiFi(true);
  Firebase.begin(&config, &auth);
}

void loop() {
  if (millis() - lastCycle < CYCLE_MS) return;
  lastCycle = millis();

  if (WiFi.status() != WL_CONNECTED) {
    setRelay(false);                       // no network: safe OFF
    connectWiFi();
    return;
  }
  if (!Firebase.ready()) {
    setRelay(false);                       // not signed in yet: safe OFF
    return;
  }

  // 1. controls from the dashboard (if one read fails we simply keep the last value)
  if (Firebase.RTDB.getBool(&fbdo, (base + "/bulb").c_str()))            bulbWanted = fbdo.boolData();
  if (Firebase.RTDB.getString(&fbdo, (base + "/settings/mode").c_str())) mode       = fbdo.stringData();
  if (Firebase.RTDB.getInt(&fbdo, (base + "/settings/threshold").c_str())) threshold = fbdo.intData();

  // 2. sensors
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  int   light       = readLight();

  // 3. relay
  if (mode == "auto") setRelay(light > threshold);
  else                setRelay(bulbWanted);

  // 4. one reading up to the cloud
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed - skipping this reading");
    return;
  }
  FirebaseJson reading;
  reading.set("temperature", temperature);
  reading.set("humidity", humidity);
  reading.set("light", light);
  reading.set("relay", relayOn);

  String path = base + "/readings/" + String((unsigned long)time(nullptr));
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &reading)) {
    Serial.printf("Sent | %.1f C | %.0f %% | light %d | relay %s | mode %s\n",
                  temperature, humidity, light, relayOn ? "ON" : "OFF", mode.c_str());
  } else {
    Serial.print("Send failed: ");
    Serial.println(fbdo.errorReason());
  }
}
