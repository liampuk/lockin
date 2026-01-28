#include "USB.h"
#include "USBHIDKeyboard.h"

USBHIDKeyboard Keyboard;

constexpr int SWITCH_PIN = 9;

bool lastState;

void setup() {
  pinMode(SWITCH_PIN, INPUT_PULLUP);

  // Wait for host USB enumeration
  delay(5000);

  USB.begin();
  Keyboard.begin();

  // Give HID time to be ready
  delay(3000);

  // Read initial state AFTER USB is ready
  lastState = digitalRead(SWITCH_PIN);

  // Optional: announce initial state for testing
  Keyboard.print(lastState == LOW ? "ON" : "OFF");
  Keyboard.write(KEY_RETURN);
}

void loop() {
  bool currentState = digitalRead(SWITCH_PIN);

  if (currentState != lastState) {
    if (currentState == LOW) {
      Keyboard.print("ON");
    } else {
      Keyboard.print("OFF");
    }
    Keyboard.write(KEY_RETURN);

    lastState = currentState;
    delay(300); // debounce
  }
}