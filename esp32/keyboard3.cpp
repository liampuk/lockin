#include "USB.h"
#include "USBHIDKeyboard.h"

USBHIDKeyboard Keyboard;

constexpr int SWITCH_PIN = 9;
constexpr int LED_PIN = 1;
bool lastState;

void setup() {
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  
  // Allow host to enumerate USB
  delay(5000);

  USB.begin();
  Keyboard.begin();

  // Give HID time to become ready
  delay(3000);

  // Configure LED pin after USB is initialized
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED off
  delay(10);
  
  // Test LED - blink 3 times on startup to verify it works
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }

  // Capture initial state after USB is ready
  lastState = digitalRead(SWITCH_PIN);
  
  // Set initial LED state based on switch position
  if (lastState == LOW) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
}

void loop() {
  bool currentState = digitalRead(SWITCH_PIN);

  // Detect switch turned ON (HIGH -> LOW transition due to INPUT_PULLUP)
  if (lastState == HIGH && currentState == LOW) {
    digitalWrite(LED_PIN, HIGH);
    delay(20);

    // Ctrl + Shift + L
    Keyboard.press(KEY_LEFT_CTRL);
    Keyboard.press(KEY_LEFT_SHIFT);
    Keyboard.press('l');
    delay(50);
    Keyboard.releaseAll();
  }

  // Detect switch turned OFF (LOW -> HIGH transition)
  if (lastState == LOW && currentState == HIGH) {
    digitalWrite(LED_PIN, LOW);
    delay(20);

    // Ctrl + Shift + K
    Keyboard.press(KEY_LEFT_CTRL);
    Keyboard.press(KEY_LEFT_SHIFT);
    Keyboard.press('k');
    delay(50);
    Keyboard.releaseAll();
  }

  lastState = currentState;
  delay(50); // debounce
}
