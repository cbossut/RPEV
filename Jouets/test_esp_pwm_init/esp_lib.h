#include <ESP8266WebServer.h>

int wifiConfig(const char* ssid, const char* password, const uint8_t* routeurIP);

//TODO Instead of passing nbBtns and btnPins to each function, we could store these in initPins
void initPins(const byte nbBtns, const byte* btnPins, const uint16_t btnInit, const byte PWMPin, const int PWMInit);

void serverConfig(const byte nbBtns, const byte* btnPins, const byte PWMPin);

void updateTriggers(const int elapsed, const byte nbBtns, const byte* btnPins);
