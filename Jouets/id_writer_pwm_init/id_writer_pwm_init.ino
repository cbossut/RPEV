#include<EEPROM.h>

const byte id = 20;          //LAST IP ADD
const uint16_t pwminit= 515; //PWM INITIAL
int res;

void setup() {
  Serial.begin(9600);
  Serial.println();
  Serial.print("Bonjour, je vais m'appeler : ");
  Serial.println(id);
  EEPROM.begin(4);
  EEPROM.write(0, id);
  EEPROM.commit();
////////////////////////////////////////gael PWMinit write //prout!
  byte pwm1 = pwminit & 0xff;
  byte pwm2 = (pwminit >> 8);
  EEPROM.write(1, pwm1);
  EEPROM.commit();
  EEPROM.write(2, pwm2);
  res =  EEPROM.commit();
  int pwmread = EEPROM.read(1) + (EEPROM.read(2) << 8); //check
 ////////////////////////////////////// 
Serial.print("Et cela donne : ");
  Serial.println(res);
  Serial.print("dernier ip : ");
  Serial.println(EEPROM.read(0));
  Serial.print("Pwm initial : ");
  Serial.println(pwmread);
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
