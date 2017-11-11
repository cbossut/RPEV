#include <ESP8266WebServer.h>

int wifiConfig(const char* ssid, const char* password, const uint8_t* routeurIP);

void initPins(const byte _nbPins, const byte* _pins, const byte _PWMPin);

void serverConfig();

void updateTriggers(const int elapsed);
