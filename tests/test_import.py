from pathlib import Path

import hun
from hun import config


def test_version():
    assert hun.__version__


def test_config_paths():
    assert isinstance(config.RAW_DIR, Path)
    assert config.RAW_DIR.is_absolute()
    assert (config.ROOT_DIR / "pyproject.toml").exists()
