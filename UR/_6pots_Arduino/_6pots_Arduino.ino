
void setup() {
  // initialize serial communications at 9600 bps:
  Serial.begin(115200);
}

void loop() {
 
  Serial.print(analogRead(A0));
  Serial.print(";");
Serial.print(analogRead(A1));
  Serial.print(";");
  Serial.print(analogRead(A2));
  Serial.print(";");
  Serial.print(analogRead(A3));
  Serial.print(";");
  Serial.print(analogRead(A4));
  Serial.print(";");
  Serial.print(analogRead(A5));
  Serial.print(";");
 Serial.print('\r');
 Serial.print('\n');
  delay(50);
}
