#include<EEPROM.h>
//Winnie the pooh exemple
const byte id = 12;           //LAST IP ADD
const uint16_t pwmInit = 750 ;  //PWM INITIAL
//WARNING fix dependance with the authorized pins
//WARNING pins 12 and 14 are protected for H bridge, they cannot be both high
const byte pinsInit = B111000;    //pin 0 4 5 12 13 14

int res;

void setup() {
  Serial.begin(9600);
  Serial.println();
  Serial.print("Bonjour, je vais m'appeler : ");
  Serial.println(id);
  
  EEPROM.begin(4);
  EEPROM.write(0, id);
  EEPROM.write(1, pwmInit & 0xff); // First half
  EEPROM.write(2, pwmInit >> 8); // Second half
  EEPROM.write(3, pinsInit);
  res =  EEPROM.commit();
  
  // Check
  Serial.print("Et cela donne : ");
  Serial.println(res);
  Serial.print("ID : ");
  Serial.println(EEPROM.read(0));
  Serial.print("Pwm initial : ");
  Serial.println(EEPROM.read(1) + (EEPROM.read(2) << 8));
  Serial.print("Pins 0 4 5 12 13 14 init : ");
  byte pins = EEPROM.read(3);
   Serial.print(bitRead(pins,5));
  Serial.print(bitRead(pins,4));
  Serial.print(bitRead(pins,3));
  Serial.print(bitRead(pins,2));
  Serial.print(bitRead(pins,1));
  Serial.println(bitRead(pins,0));
  pinMode(2, OUTPUT);
  digitalWrite(2, 0);
}

int i = 0;
void loop() {
  if (!res) {
    analogWrite(2, i++);
    delay(1);
    i = i == 1024 ? 0 : i;
  }
}
