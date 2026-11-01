#!/bin/bash
PYTHONPATH=/Users/3zooz/مشاريع Python/مشاريع 2026/backend:$PYTHONPATH /opt/homebrew/Cellar/python@3.14/3.14.6/Frameworks/Python.framework/Versions/3.14/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
