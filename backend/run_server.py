"""Start the real API with database-backed authentication."""
import os
import uvicorn

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.getenv("PORT", "5002")))
