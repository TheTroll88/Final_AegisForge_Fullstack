"""
Voice Input Script — Captures audio from mic and outputs text to file.
Run this in a separate terminal to speak commands.
"""
import speech_recognition as sr
import sys
import os

def capture_voice():
    recognizer = sr.Recognizer()
    
    print("🎤 Voice Input Initialized")
    print("Speak your command. Press Ctrl+C to exit.\n")
    
    with sr.Microphone() as source:
        print("Listening... (Speak now)")
        try:
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
            # Listen for audio
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            
            # Transcribe
            print("Processing...")
            text = recognizer.recognize_google(audio).lower()
            
            # Output to file
            output_file = "logs/voice_input.txt"
            os.makedirs("logs", exist_ok=True)
            
            with open(output_file, "w") as f:
                f.write(text)
            
            print(f"\n✅ Command captured: '{text}'")
            print(f"💾 Saved to {output_file}")
            
        except sr.WaitTimeoutError:
            print("⏱️ No speech detected.")
        except sr.UnknownValueError:
            print("❌ Could not understand audio.")
        except sr.RequestError:
            print("❌ API unavailable.")
        except KeyboardInterrupt:
            print("\n👋 Exiting...")
            sys.exit(0)
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    capture_voice()
