#include<EEPROM.h>

const byte id = 10;

int res;

void setup() {
  Serial.begin(9600);
  Serial.print("Bonjour, je vais m'appeler ");
  Serial.println(id);
  
  EEPROM.begin(4);
  EEPROM.write(0, id);
  res = EEPROM.commit();
  Serial.print("Et ça donne ça : ");
  Serial.println(res);

  pinMode(2, OUTPUT);
  digitalWrite(2, 0);
  
  /*
  for (int i = 0 ; i < 21 ; i++) {
    Serial.print(i);
    Serial.print(" : ");
    Serial.println(EEPROM.read(i));
  }
  */
}

int i = 0;
void loop() {
  if (!res) {
    analogWrite(2, i++);
    delay(1);
    i = i == 1024 ? 0 : i;
  }
}
