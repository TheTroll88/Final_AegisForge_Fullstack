import importlib

def load_strategy(name):
    try:
        module = importlib.import_module(f"strategies.{name}")
        return module.run_strategy
    except ModuleNotFoundError:
        raise Exception(f"Strategy '{name}' not found.")
    except AttributeError:
        raise Exception(f"Strategy '{name}' is missing a 'run_strategy' function.")
