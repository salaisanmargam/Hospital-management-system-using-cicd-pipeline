"""
Shared pytest fixtures and configuration for the MedCore backend test suite.
"""
import sys
import os

# Ensure the backend package is importable when pytest is run from this directory
sys.path.insert(0, os.path.dirname(__file__))
