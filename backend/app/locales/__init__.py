"""Translate system-owned report labels; customer record text stays untouched."""
import json
from pathlib import Path
ARABIC=json.loads((Path(__file__).parent/'ar.json').read_text())
def label(value,language='en'):
    return ARABIC.get(value,value) if language=='ar' else value
