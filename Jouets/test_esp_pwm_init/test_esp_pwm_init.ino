#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include "esp_lib.h"

//const char* ssid = "Pierre_Luc";
//const char* password = "Pink fluffy unicorns dancing on rainbows";
const char* ssid = "NUMERICABLE-A7A6";
const char* password = "dd0258ce42f43e8ae7eacd4d4d";
 uint8_t routeurIP[4] = {192,168,0,1};

const byte nbBtns = 5;
const byte btnPins[nbBtns] = {4,5,12,13,14}; // Pins 1 and 3 reserved for Serial communication toute les pins utilisable TODO virer les boutnons/ appel gpio direct
const uint16_t btnInit = B000; // Btn 1 <=> rightmost bit
const byte PWMPin = 16;
const byte ledPin = 2;
int PWMInit ;

ESP8266WebServer server(80);

int wifiStatus;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(PWMPin, OUTPUT);
  for (byte i = 0 ; i < nbBtns ; i++) {
    pinMode(btnPins[i], OUTPUT);
  }
  Serial.begin(9600);//TODO serial OFF
  Serial.setDebugOutput(true);
  
  wifiStatus = wifiConfig(ssid, password, routeurIP);
  Serial.print("Wifi status is ");
  Serial.println(wifiStatus);
  Serial.println(WiFi.localIP());
  initPins(nbBtns, btnPins, btnInit, PWMPin, PWMInit);
  serverConfig(nbBtns, btnPins, PWMPin);
  server.begin();

}

unsigned long prevMs = 0;
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    analogWrite(ledPin, 1000);
  } else {
    digitalWrite(ledPin, 0);
  }
  unsigned long curMs = millis();
  updateTriggers(curMs - prevMs, nbBtns, btnPins);
  prevMs = curMs;
  server.handleClient();
}
