# TODO / Backlog

## Security hardening (optional)

Pluto is designed to run on home servers (e.g. Umbrel) and is typically not exposed to the public internet. That said, these items should be considered to reduce risk in case of misconfiguration or accidental exposure.

- Add optional authN/authZ (e.g. shared token / Umbrel auth integration) for backend + discovery
- Add request rate limiting and basic hardening middleware (helmet/cors) where applicable
- Protect `/metrics` and any Prometheus proxy endpoints (e.g. internal-only behind `app_proxy`, or bind to localhost / internal network)
- Constrain discovery scanning to private ranges / allowlisted subnets (Umbrel LAN); reject non-local/public targets by default
- Revisit Docker privileges/networking for development vs release (avoid `network_mode: host` outside dev where possible)

## Repo hygiene

- `frontend/.env.local` is intentionally ignored (per `frontend/.gitignore`) and should not be committed.
