/* Task 2 - Cloud MQTT relay
   The ESP32 subscribes to an Adafruit IO feed called "bulb". When the dashboard
   toggle publishes ON or OFF, the relay switches. It always starts OFF. */

#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* AIO_USERNAME  = "YOUR_ADAFRUIT_IO_USERNAME";
const char* AIO_KEY       = "YOUR_ADAFRUIT_IO_KEY";

const char* MQTT_SERVER = "io.adafruit.com";
const int   MQTT_PORT   = 1883;

const int RELAY_PIN = 26;
const int RELAY_ON  = LOW;     // most 5V relay modules are active LOW ...
const int RELAY_OFF = HIGH;    // ... swap these two lines if yours is the opposite

String topic;                  // becomes YOUR_USERNAME/feeds/bulb
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

void setRelay(bool on) {
  digitalWrite(RELAY_PIN, on ? RELAY_ON : RELAY_OFF);
  Serial.println(on ? "Relay ON" : "Relay OFF");
}

// Runs every time a message arrives on the topic.
void onMessage(char* messageTopic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  msg.trim();
  msg.toUpperCase();
  Serial.print("Received: ");
  Serial.println(msg);
  if (msg == "ON" || msg == "1") setRelay(true);
  else if (msg == "OFF" || msg == "0") setRelay(false);
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

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT... ");
    String clientId = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (mqtt.connect(clientId.c_str(), AIO_USERNAME, AIO_KEY)) {
      Serial.println("connected");
      mqtt.subscribe(topic.c_str());
      Serial.print("Subscribed to ");
      Serial.println(topic);
    } else {
      Serial.print("failed, code ");
      Serial.print(mqtt.state());
      Serial.println(" - trying again in 5 s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  digitalWrite(RELAY_PIN, RELAY_OFF);     // choose the OFF level first ...
  pinMode(RELAY_PIN, OUTPUT);             // ... then make the pin an output, so the relay never blips on at boot

  topic = String(AIO_USERNAME) + "/feeds/bulb";
  connectWiFi();
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setRelay(false);                      // lost the network: fall back to the safe OFF state
    connectWiFi();
  }
  if (!mqtt.connected()) {
    setRelay(false);                      // lost the broker: safe OFF as well
    connectMqtt();
  }
  mqtt.loop();                            // keeps the connection alive and delivers messages
}
