import os
import sys

# Add project root to python path to import server.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

# Vercel needs the app application instance to handle requests
# The app instance handles routes natively due to the vercel.json rewrite
