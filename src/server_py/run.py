import uvicorn
import os
import sys

# Add the current directory to sys.path to ensure module resolution works
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Port 8081 as per strict requirement in Section 0
    uvicorn.run("app.main:app", host="0.0.0.0", port=8081, reload=True)
