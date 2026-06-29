import os
import sys

# Add the backend directory to sys.path so that 'app' is recognized as a top-level package
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

