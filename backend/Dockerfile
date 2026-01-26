# Use official Python runtime
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file (ensure it lists all dependencies)
COPY requirements.txt .

# Install dependencies (no cache for smaller size)
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (server.py, breathing_db.json, .env if needed)
COPY . .

# Expose port 8001
EXPOSE 8001

# Run server with Uvicorn (Production Mode)
# Using --host 0.0.0.0 is critical for Docker networking
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
