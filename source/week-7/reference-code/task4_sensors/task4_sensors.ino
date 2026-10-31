/* Task 4.1 - Forge hardware test
   Reads the DHT11 (temperature + humidity) and the LDR (light), averages the
   light over 15 samples, and switches the relay on its own when the light
   reading is above a threshold. Everything is printed to the Serial Monitor.
   No WiFi and no cloud yet - this proves the hardware first. */

#include <DHT.h>

const int DHT_PIN   = 4;       // DHT11 data
const int LDR_PIN   = 34;      // LDR divider (an ADC1 pin, so it also works once WiFi is on)
const int RELAY_PIN = 26;      // relay module IN
const int RELAY_ON  = LOW;     // swap if your relay module is the opposite (see Task 2)
const int RELAY_OFF = HIGH;

const int SAMPLES       = 15;  // readings averaged into one light value
const int SAMPLE_GAP_MS = 8;   // pause between two samples
int threshold = 2000;          // 0-4095: relay ON above this light reading (tune it later)

DHT dht(DHT_PIN, DHT11);

int readLightAveraged() {
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(LDR_PIN);
    delay(SAMPLE_GAP_MS);
  }
  return sum / SAMPLES;
}

void setup() {
  Serial.begin(115200);
  digitalWrite(RELAY_PIN, RELAY_OFF);      // start in the safe OFF state
  pinMode(RELAY_PIN, OUTPUT);
  dht.begin();
}

void loop() {
  float temperature = dht.readTemperature();   // degrees C
  float humidity    = dht.readHumidity();      // percent
  int lightRaw      = analogRead(LDR_PIN);     // one single reading: jumpy
  int light         = readLightAveraged();     // 15 readings averaged: steady

  bool relayOn = light > threshold;
  digitalWrite(RELAY_PIN, relayOn ? RELAY_ON : RELAY_OFF);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed - check the wiring");
  } else {
    Serial.printf("Temp %.1f C | Humidity %.0f %% | Light raw %d -> averaged %d | Relay %s\n",
                  temperature, humidity, lightRaw, light, relayOn ? "ON" : "OFF");
  }
  delay(2000);                                 // the DHT11 needs at least 2 s between reads
}
