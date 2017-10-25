#include "esp_lib.h"

#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

extern ESP8266WebServer server;

int wifiConfig(const char* ssid, const char* password, const uint8_t* routeurIP) {
  EEPROM.begin(4);
  uint8_t id = EEPROM.read(0);
  
  IPAddress ip(routeurIP[0], routeurIP[1], routeurIP[2], id);
  IPAddress routeur(routeurIP);
  
  WiFi.config(ip, routeur, routeur); // routeur for dns and gateway, default subnet 255.255.255.0
  return WiFi.begin(ssid, password);
}


uint16_t btnStates = 0;
int PWMState = 0;
unsigned int triggerDelays[16] = {0}; // in ms, neg delay <=> inv trig


byte inverseBtn(const byte btn, const byte* btnPins) {
  byte state = 1 - bitRead(btnStates, btn-1);
  bitWrite(btnStates, btn-1, state);
  digitalWrite(btnPins[btn-1], state);
  return state;
}


void initPins(const byte nbBtns, const byte* btnPins, const uint16_t btnInit, const byte PWMPin, const int PWMInit) {
  byte i;
  for (i = 0 ; i < nbBtns ; i++) {
    digitalWrite(btnPins[i], bitRead(btnInit, i));
  }
  analogWrite(PWMPin, PWMInit);
  btnStates = btnInit;
  PWMState = PWMInit;
}

// Convention : Btn is always human readable (from 1) ; use btn-1 for arrays
// TODO inverse the convention would cause less errors !!
byte getBtnArg(const byte nbBtns) {
  byte btn = server.arg("btn").toInt();
  if (!btn) {
    server.sendContent("No BTN !"); //TODO Do I need to send back a valid HTTP request w/ header to work w/ browser ? plus we could use HTTP codes as error codes ?
    return 0;
  }
  if (btn > nbBtns) {
    char buf[25];
    sprintf(buf, "Only %d btns defined", nbBtns);
    server.sendContent(buf);
    return 0;
  }
  if (triggerDelays[btn-1]) {
    server.sendContent("Trigger in progress for btn"+btn);
    return 0;
  }
  return btn;
}


void serverConfig(const byte nbBtns, const byte* btnPins, const byte PWMPin) {
  // trigger set the btnPin to 1 or 0 (if inv) for a limited time, preventing other actions on this btn
  server.on("/trigger", [nbBtns, btnPins]()mutable->void{
    byte btn = getBtnArg(nbBtns);
    if (!btn) {
      return;
    }
    
    byte state = 1 - server.arg("inv").toInt(); // 0 or 1
    
    int delay = server.arg("delay").toInt(); // 0 if no arg
    delay = delay ? delay : 200; // default delay to 200ms
    
    digitalWrite(btnPins[btn-1], state);
    bitWrite(btnStates, btn-1, state);
    server.sendContent("b"+btn+state+delay); //WARNING if btn >= 10, different number of chars...
    triggerDelays[btn-1] = delay; //TODO delay proportionnal to PWM ?
  });
  
  // toggle change the actual state of the btnPin (if no trig in progress)
  server.on("/toggle", [nbBtns, btnPins]()mutable->void{
    byte btn = getBtnArg(nbBtns);
    if (!btn) {
      return;
    }
    
    byte state = inverseBtn(btn, btnPins);
    server.sendContent("b"+btn+state);
  });
  
  server.on("/PWM", [PWMPin]()mutable->void{
    if (!server.hasArg("v")) {
      server.sendContent("No value !");
      return;
    }
    int v = server.arg("v").toInt();
    analogWrite(PWMPin, v);
    server.sendContent("p"+v);
  });
  
  // status
  server.on("/", [nbBtns]()mutable->void{
    char buf[20];
    sprintf(buf, "n%ds%dp%d", nbBtns, btnStates, PWMState);
    server.sendContent(buf);
  });
}


void updateTriggers(const int elapsed, const byte nbBtns, const byte* btnPins) {
  byte i;
  for (i = 0 ; i < nbBtns ; i++) {
    if (triggerDelays[i]) {
      if (triggerDelays[i] - elapsed <= 0) {
        triggerDelays[i] = 0;
        byte state = inverseBtn(i+1, btnPins);
        //server.sendContent("b"+i+1+"r"+state); //TODO How to talk with client outside request ?
      } else {
        triggerDelays[i] -= elapsed;
      }
    }
  }
}
