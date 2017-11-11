#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

#include "esp_lib.h"

const char* ssid = "NUMERICABLE-A7A6";
const char* password = "dd0258ce42f43e8ae7eacd4d4d";
const uint8_t routeurIP[4] = {192,168,0,1};

const byte nbPins = 5;
const byte pins[nbPins] = {4,5,12,13,14}; // Pins 1 and 3 reserved for Serial communication
const byte PWMPin = 16;
const byte ledPin = 2;

ESP8266WebServer server(80);

int wifiStatus;

void setup() {
  pinMode(ledPin, OUTPUT);
  
  wifiStatus = wifiConfig(ssid, password, routeurIP);
  initPins(nbPins, pins, PWMPin);
  serverConfig();
  // test function to blink the led
  server.on("/led", []{
    digitalWrite(2, 0);
    server.send(200, "text/plain", "Led the light !");
  });
  server.begin();
}

unsigned long prevMs = 0;
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    analogWrite(ledPin, 1022);
  } else {
    digitalWrite(ledPin, 0);
  }
  unsigned long curMs = millis();
  updateTriggers(curMs - prevMs);
  prevMs = curMs;
  server.handleClient();
}

