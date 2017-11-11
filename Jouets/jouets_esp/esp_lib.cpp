#include "esp_lib.h"

#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

//WARNING all the code assumes the max number of pins is 16, by using uint16_t as bitarray
#define MAX_PINS 16
//NOTE pins 12 and 14 are used for H bridge, therefore there's a fixed  security to prevent both high
#define H_PIN1 12
#define H_PIN2 14

extern ESP8266WebServer server; // Instantiated in the .ino to prevent large memory usage by argument

const char* httype = "text/plain";

byte nbPins; // number of authorized pins
byte pins[MAX_PINS]; // list of authorized pins
byte PWMPin;
uint16_t pinStates = 0; // bit n is gpio n, don't care about authorized pins
uint16_t PWMState = 0;

unsigned int triggerDelays[MAX_PINS] = {0}; // delay for pin i in ms


///////////////////////// WiFi

int wifiConfig(const char* ssid, const char* password, const uint8_t* routeurIP) {
  EEPROM.begin(4);
  uint8_t id = EEPROM.read(0);
  EEPROM.end();
  
  IPAddress ip(routeurIP[0], routeurIP[1], routeurIP[2], id);
  IPAddress routeur(routeurIP);
  IPAddress subnet(255,255,255,0);
  
  WiFi.config(ip, routeur, subnet);//NOTE Seems that WiFi.config doesn't have the same signature than in Arduino ! routeur); // routeur for dns and gateway, default subnet 255.255.255.0
  return WiFi.begin(ssid, password);
}


///////////////////////// General gpio writing

// Sets gpio n to state, don't care about authorized pins, protect H bridge
bool setPin(const byte n, const byte state) {
  if (state &&
      ((n == H_PIN1 && bitRead(pinStates, H_PIN2)) ||
       (n == H_PIN2 && bitRead(pinStates, H_PIN1)))) {
    return false;
  }
  digitalWrite(n, state);
  bitWrite(pinStates, n, state);
  return true;
}

void setPWM(const uint16_t v) {
  analogWrite(PWMPin, v);
  PWMState = v;
}

// Inverse gpio n state, don't care about authorized pins
byte inversePin(const byte n) {
  byte state = 1 - bitRead(pinStates, n);
  if (setPin(n, state)) { // checks protection for H bridge
    return state;
  } else {
    return -1;
  }
}

void initPins(const byte _nbPins, const byte* _pins, const byte _PWMPin) {
  EEPROM.begin(4);
  uint16_t PWMInit = EEPROM.read(1) + (EEPROM.read(2) << 8);
  byte pinsInit = EEPROM.read(3); // last pin is rightmost bit
  EEPROM.end();
  
  PWMPin = _PWMPin;
  pinMode(PWMPin, OUTPUT);
  setPWM(PWMInit);
  
  nbPins = _nbPins;
  byte i;
  for (i = 0 ; i < nbPins ; i++) {
    pins[i] = _pins[i];
    pinMode(pins[i], OUTPUT);
    setPin(pins[i], bitRead(pinsInit, nbPins-i)); //WARNING bug if pinsInit sets H pins both high
  }
}

           
//////////////////////// HTTP things

void sendResponse(const String mess) { // FUTURE Use HTTP codes
  server.send(200, httype, mess);
}

// Retrieve pin arg from server, checks if that pin is authorized and in trig delay
byte getPinArg() {
  byte pin = server.arg("pin").toInt();
  if (!pin) {
    sendResponse("No Pin !");
    return -1;
  }
  bool authorized = false;
  byte i;
  for (i = 0 ; i < nbPins ; i++) {
    if (pin == pins[i]) {
      authorized = true;
      break;
    }
  }
  if (!authorized) {
    char buf[25];
    sprintf(buf, "Pin %d unauthorized", pin);
    sendResponse(buf);
    return -1;
  }
  if (triggerDelays[pin]) {
    char buf[30];
    sprintf(buf, "Trigger in progress for pin %d", pin);
    sendResponse(buf);
    return 0;
  }
  return pin;
}

void serverConfig() {
  // trigger set the pin to 1 or 0 (if inv) for a limited time, preventing other actions on this pin
  server.on("/trigger", [&]()mutable->void{
    byte pin = getPinArg();
    if (pin == -1) {
      return;
    }
    
    byte state = 1 - server.arg("inv").toInt(); // 0 or 1
    
    int delayTime = server.arg("delay").toInt(); // 0 if no arg
    delayTime = delayTime ? delayTime : 200; // default delay to 200ms
    
    if (setPin(pin, state)) {
      char buf[10];
      sprintf(buf, "b%d%d%d", pin, state, delayTime);
      sendResponse(buf); //WARNING if pin >= 10, different number of chars...
      triggerDelays[pin] = delayTime; //TODO delay proportionnal to PWM ?
    } else {
      sendResponse("H pins cannot be both high !");
    }
  });
  
  // toggle change the actual state of the pin (if no trig in progress)
  server.on("/toggle", [&]()mutable->void{
    byte pin = getPinArg();
    if (pin == -1) {
      return;
    }
    
    byte state = inversePin(pin);
    if (state == -1) {
      sendResponse("H pins cannot be both high !");
    } else {
      char buf[5];
      sprintf(buf, "b%d%d", pin, state);
      sendResponse(buf);
    }
  });
  
  server.on("/PWM", [&]()mutable->void{
    if (!server.hasArg("v")) {
      sendResponse("No value !");
      return;
    }
    int v = server.arg("v").toInt();
    setPWM(v);
    char buf[10];
    sprintf(buf, "p%d", v);
    sendResponse(buf);
  });

  // Reset the trigger delays in case of stuck bug
  server.on("/reset", [&]()mutable->void{
    byte i;
    for (i = 0 ; i < nbPins ; i++) {
      if (triggerDelays[pins[i]]) {
        inversePin(pins[i]);
        triggerDelays[pins[i]] = 0;
      }
    }
    sendResponse("Reseted triggers");
  });
  
  // status
  /*
  server.on("/", ()mutable->void{
    char buf[20];
    sprintf(buf, "n%ds%dp%d", nbBtns, btnStates, PWMState);
    server.send(200, httype, buf);
  });
  */
}




void updateTriggers(const int elapsed) {
  byte i;
  for (i = 0 ; i < nbPins ; i++) {
    byte pin = pins[i];
    if (triggerDelays[pin]) {
      if (triggerDelays[pin] - elapsed <= 0) {
        triggerDelays[pin] = 0;
        byte state = inversePin(pin);
        //server.send(200, httype, "b"+i+1+"r"+state); //TODO How to talk with client outside request ?
      } else {
        triggerDelays[pin] -= elapsed;
      }
    }
  }
}
