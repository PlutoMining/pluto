FROM python:3.12-slim

# Set environment variables for Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install only production dependencies (no test/lint tools)
# When building from the monorepo root (see scripts/beta-release.sh),
# requirements live under the pyasic-bridge directory.
COPY pyasic-bridge/requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt && \
    rm -rf /root/.cache/pip

# Copy only application code
# The app code is under pyasic-bridge/app when using the repo root as context.
COPY pyasic-bridge/app ./app/

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 8000

# Health check (using Python's http.client which is in stdlib)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import http.client; conn = http.client.HTTPConnection('localhost', 8000); conn.request('GET', '/health'); r = conn.getresponse(); exit(0 if r.status == 200 else 1)" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
