# Pyasic Bridge

A FastAPI service that wraps the pyasic library to provide REST API access for miner discovery, data retrieval, and control operations.

## Development Setup

### Recommended: Docker Development (Full Stack)

The service is included in the main docker-compose setup with hot-reload enabled:

```bash
# From project root - starts all services including pyasic-bridge
make up
```

The `Dockerfile.development` is used, which:
- Mounts the source code as a volume (`./pyasic-bridge:/app`)
- Runs with `--reload` for automatic code reloading
- Changes to Python files automatically restart the service

This matches the development pattern used by other services (backend, frontend, discovery, mock).

To rebuild the container:

```bash
docker compose -f docker-compose.dev.local.yml build pyasic-bridge
docker compose -f docker-compose.dev.local.yml up pyasic-bridge
```

### Alternative: Local Development (Fast Iteration)

For fast local iteration on a single service without Docker:

1. **Set up virtual environment (using Makefile):**

```bash
# From project root
make setup-pyasic-bridge
```

Or manually:

```bash
cd pyasic-bridge
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

2. **Run the service:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables hot-reload for development.

3. **Run tests:**

```bash
# Using pytest directly
pytest

# Using the test script
./run_tests.sh

# Using Makefile (from project root)
make test-pyasic-bridge
```

4. **Run linting:**

```bash
# Using ruff directly
ruff check app tests

# Using Makefile (from project root)
make lint-pyasic-bridge
```

**Note**: When running locally, ensure other services (backend, discovery) can reach pyasic-bridge. The backend expects it at `http://pyasic-bridge:8000` in Docker, or `http://localhost:8000` when running locally.

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for detailed directory structure.

## Testing

See [TESTING.md](TESTING.md) for comprehensive testing documentation.

## API Documentation

Once the service is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

- `NORMALIZATION_STRATEGY`: Normalization strategy to use (default: "default")
- `PYTHONUNBUFFERED`: Set to 1 for unbuffered output (useful in Docker)

## Dependencies

- FastAPI: Web framework
- Uvicorn: ASGI server
- Pyasic: Miner communication library (PlutoMining fork)
- Pydantic: Data validation
- Pytest: Testing framework
- Ruff: Linting and formatting
