#include "USB.h"
#include "USBHIDKeyboard.h"

USBHIDKeyboard Keyboard;

void setup() {
  delay(5000);

  USB.begin();
  Serial.begin(115200);
  Keyboard.begin();Hello world


  delay(2000);

  Serial.println("Typing now");
  Keyboard.println("Hello world");
}

void loop() {}
Hello world
