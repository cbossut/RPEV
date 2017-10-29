#include "esp_lib.h"

#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

extern ESP8266WebServer server;

const char* httype = "text/plain";

int wifiConfig(const char* ssid, const char* password, const uint8_t* routeurIP) {
  EEPROM.begin(4);
  uint8_t id = EEPROM.read(0);
  
  IPAddress ip(routeurIP[0], routeurIP[1], routeurIP[2], id);
  IPAddress routeur(routeurIP);
  IPAddress subnet(255,255,255,0);
  
  WiFi.config(ip, routeur, subnet);//NOTE Seems that WiFi.config doesn't have the same signature than in Arduino ! routeur); // routeur for dns and gateway, default subnet 255.255.255.0
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
    server.send(200, httype, "No BTN !"); //TODO Do I need to send back a valid HTTP request w/ header to work w/ browser ? plus we could use HTTP codes as error codes ?
    return 0;
  }
  if (btn > nbBtns) {
    char buf[25];
    sprintf(buf, "Only %d btns defined", nbBtns);
    server.send(200, httype, buf);
    return 0;
  }
  if (triggerDelays[btn-1]) {
    char buf[30];
    sprintf(buf, "Trigger in progress for btn%d", btn);
    server.send(200, httype, buf);
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
    
    int delayTime = server.arg("delay").toInt(); // 0 if no arg
    delayTime = delayTime ? delayTime : 200; // default delay to 200ms
    
    digitalWrite(btnPins[btn-1], state);
    bitWrite(btnStates, btn-1, state);
    char buf[10];
    sprintf(buf, "b%d%d%d", btn, state, delayTime);
    server.send(200, httype, buf); //WARNING if btn >= 10, different number of chars...
    triggerDelays[btn-1] = delayTime; //TODO delay proportionnal to PWM ?
  });
  
  // toggle change the actual state of the btnPin (if no trig in progress)
  server.on("/toggle", [nbBtns, btnPins]()mutable->void{
    byte btn = getBtnArg(nbBtns);
    if (!btn) {
      return;
    }
    
    byte state = inverseBtn(btn, btnPins);
    char buf[5];
    sprintf(buf, "b%d%d", btn, state);
    server.send(200, httype, buf);
  });
  
  server.on("/PWM", [PWMPin]()mutable->void{
    if (!server.hasArg("v")) {
      server.send(200, httype, "No value !");
      return;
    }
    int v = server.arg("v").toInt();
    analogWrite(PWMPin, v);
    char buf[10];
    sprintf(buf, "p%d", v);
    server.send(200, httype, buf);
  });

  // Reset the trigger delays in case of stuck bug
  server.on("/reset", [nbBtns, btnPins]{
    byte i;
    for (i = 0 ; i < nbBtns ; i++) {
      if (triggerDelays[i]) {
        inverseBtn(i+1, btnPins);
        triggerDelays[i] = 0;
      }
    }
    server.send(200, httype, "Reseted triggers");
  });
  
  // status
  server.on("/", [nbBtns]()mutable->void{
    char buf[20];
    sprintf(buf, "n%ds%dp%d", nbBtns, btnStates, PWMState);
    server.send(200, httype, buf);
  });

  // test function to blink the led
  server.on("/led", []{
    digitalWrite(2, server.arg("v").toInt());
    server.send(200, httype, "Led the light !");
  });
}


void updateTriggers(const int elapsed, const byte nbBtns, const byte* btnPins) {
  byte i;
  for (i = 0 ; i < nbBtns ; i++) {
    if (triggerDelays[i]) {
      if (triggerDelays[i] - elapsed <= 0) {
        triggerDelays[i] = 0;
        byte state = inverseBtn(i+1, btnPins);
        //server.send(200, httype, "b"+i+1+"r"+state); //TODO How to talk with client outside request ?
      } else {
        triggerDelays[i] -= elapsed;
      }
    }
  }
}
