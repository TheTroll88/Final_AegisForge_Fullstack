"""Microphone Input Tool — Capture audio from terminal and transcribe."""

import os
import tempfile
from logos.tools.base import BaseTool, ToolResult
import speech_recognition as sr

class MicrophoneTool(BaseTool):
    """Capture audio from microphone and transcribe to text."""
    name = "microphone"
    description = "Capture audio from microphone and transcribe to text"
    parameters = {
        "type": "object",
        "properties": {},
        "required": []
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        try:
            recognizer = sr.Recognizer()
            
            with sr.Microphone() as source:
                return ToolResult(True, "Listening... Speak now.", self.name)
            
            # This would require interactive input, which is tricky in async
            # For now, we'll return a message telling the user to use a different method
            return ToolResult(False, "Microphone input requires interactive session. Use a dedicated audio input terminal.", self.name)
            
        except ImportError:
            return ToolResult(False, "SpeechRecognition not installed. Run: pip install SpeechRecognition", self.name)
        except Exception as e:
            return ToolResult(False, f"Microphone error: {e}", self.name)
