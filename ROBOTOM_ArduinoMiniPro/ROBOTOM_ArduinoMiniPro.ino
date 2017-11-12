
int TRoll ;
byte TBoom = 20; //DURéE Implusions
byte state8 = 0;
byte state9 = 0;
unsigned long T8 = 0;
unsigned long T9 = 0;
int Rc; //puslein receiver

void setup() {

  Serial.begin(57600);
  pinMode (6, INPUT);
  pinMode (8, OUTPUT);
  pinMode (9, OUTPUT);
  digitalWrite(8, LOW);
  digitalWrite(9, LOW);
}
void roll() { 
    if (state8==0 && state9==0) {digitalWrite(8, HIGH); state8=2; T8 = millis(); }
    if (state8 == 2 && millis() >= T8 + TBoom) {digitalWrite(8, LOW); state8 = 0; state9=3; }
    if (state9 == 3 && millis() >= T8 + TRoll) {digitalWrite(9, HIGH); state8 = 0; state9=2; T8 = millis();}
    if (state9 == 2 && millis() >= T8 + TBoom) {digitalWrite(9, LOW); state8 = 3; state9=0; }
    if (state8 == 3 && millis() >= T8 + TRoll) { state8 = 0; state9=0; }
  }
void loop() {
    Rc = pulseIn(6, HIGH, 25000); // Read the pulse width
    
    //Serial.println(Rc); 
   if (Rc>1400 && Rc<1500 )
    { state8=0; state9=0; digitalWrite(8, LOW); digitalWrite(9, LOW);}
   if (Rc==0)
    { state8=0; state9=0; digitalWrite(8, LOW); digitalWrite(9, LOW);} 
    
 if (Rc>=1800){TRoll=42; roll();}
    else if (Rc>=1700){TRoll=56; roll();}
     else if (Rc>=1600){TRoll=83; roll();}
     else if (Rc>=1500){TRoll=100; roll();}
     else {}
     
   if (Rc!=0 && Rc<=1400){ TRoll = (Rc-980)/2; Serial.println(TRoll);  roll();}
  

//     if (Rc==0){
//    if (state8==0 && state9==0) {digitalWrite(8, HIGH); state8=2; T8 = millis(); }
//    if (state8 == 2 && millis() >= T8 + TBoom) {digitalWrite(8, LOW); state8 = 0; state9=3; }
//    if (state9 == 3 && millis() >= T8 + TRoll/2) {digitalWrite(9, HIGH); state8 = 0; state9=2; T8 = millis();}
//    if (state9 == 2 && millis() >= T8 + TBoom) {digitalWrite(9, LOW); state8 = 3; state9=0; }
//    if (state8 == 3 && millis() >= T8 + TRoll/2) { state8 = 0; state9=0; }
//    }
//delay(50);
  }
