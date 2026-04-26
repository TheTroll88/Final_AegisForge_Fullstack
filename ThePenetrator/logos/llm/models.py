"""Model registry and switching."""

from __future__ import annotations


class ModelRegistry:
    """Tracks available models and the current active model."""

    def __init__(self, default: str, available: list[str]):
        self.current = default
        self.available = available

    def switch(self, model_name: str) -> str:
        """Switch to a model. Returns the model ID."""
        self.current = model_name
        if model_name not in self.available:
            self.available.append(model_name)
        return self.current

    def get_current_model(self) -> str:
        """Returns the ID of the model currently driving the Vanguard."""
        return self.current

    def list_models(self) -> list[str]:
        return list(self.available)
