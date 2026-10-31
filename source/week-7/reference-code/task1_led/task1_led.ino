/* Task 1 - Browser-controlled LED
   The ESP32 joins your WiFi, serves a small control page, and switches the
   built-in LED (GPIO2) when the page asks it to. */

#include <WiFi.h>
#include <WebServer.h>

const char* WIFI_SSID     = "YOUR_WIFI_NAME";        // the SSID, exactly as your phone shows it
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const int LED_PIN = 2;      // GPIO2 is wired to the built-in LED
WebServer server(80);       // port 80 is the normal web port
bool ledOn = false;

// The control page. It is stored in the ESP32's flash and sent to the browser as-is.
const char PAGE[] PROGMEM = R"HTML(<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32 LED</title>
<style>
  body{font-family:sans-serif;text-align:center;margin-top:60px}
  button{font-size:22px;padding:14px 34px;margin:8px;border:0;border-radius:8px}
  #s{font-size:20px;margin-top:22px}
</style></head><body>
<h2>ESP32 built-in LED</h2>
<button onclick="send('on')">ON</button>
<button onclick="send('off')">OFF</button>
<div id="s">LED is ...</div>
<script>
  function show(t){ document.getElementById('s').textContent = 'LED is ' + t; }
  function send(path){ fetch('/' + path).then(r => r.text()).then(show); }
  fetch('/state').then(r => r.text()).then(show);
</script>
</body></html>)HTML";

void sendState() { server.send(200, "text/plain", ledOn ? "ON" : "OFF"); }
void handleRoot() { server.send(200, "text/html", PAGE); }
void handleOn()  { ledOn = true;  digitalWrite(LED_PIN, HIGH); sendState(); }   // active HIGH: HIGH = on
void handleOff() { ledOn = false; digitalWrite(LED_PIN, LOW);  sendState(); }

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);                       // act as a WiFi client
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Connected. Open this address in a browser:");
  Serial.print("http://");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);                // the page
  server.on("/on", handleOn);                // endpoint: LED on
  server.on("/off", handleOff);              // endpoint: LED off
  server.on("/state", sendState);            // endpoint: is the LED on?
  server.begin();
}

void loop() {
  server.handleClient();                     // answer any waiting browser request
}
