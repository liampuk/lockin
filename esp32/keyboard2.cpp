#include "USB.h"
#include "USBHIDKeyboard.h"

USBHIDKeyboard Keyboard;

constexpr int SWITCH_PIN = 9;
constexpr int LED_PIN = 7;
bool lastState;
bool ledState = false;

void setup() {
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  
  // Allow host to enumerate USB
  delay(5000);

  USB.begin();
  Keyboard.begin();

  // Give HID time to become ready
  delay(3000);

  // Configure LED pin after USB is initialized
  // Use explicit OUTPUT mode and ensure pin is properly initialized
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED off
  delay(10); // Small delay to ensure pin state is set
  
  // Test LED - blink 3 times on startup to verify it works
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
  
  // Ensure LED starts in OFF state
  digitalWrite(LED_PIN, LOW);
  ledState = false;

  // Capture initial state after USB is ready
  lastState = digitalRead(SWITCH_PIN);
}

void loop() {
  bool currentState = digitalRead(SWITCH_PIN);


  // Detect OFF -> ON transition
  if (lastState == HIGH && currentState == LOW) {
    // Toggle LED state
    ledState = !ledState;
    
    // Set LED pin state explicitly
    if (ledState) {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
    
    // Small delay to ensure LED state is set before keyboard command
    delay(20);

    // Ctrl + Shift + L
    Keyboard.press(KEY_LEFT_CTRL);
    Keyboard.press(KEY_LEFT_SHIFT);
    Keyboard.press('l');          // lowercase is fine

    delay(50);                    // small hold

    Keyboard.releaseAll();
  }

  lastState = currentState;
  delay(50); // debounce
}
