# Build SV2 Job Declarator Client (JDC) from sv2-apps source
# Based on: https://github.com/stratum-mining/sv2-apps
# MSRV: Rust 1.85.0

FROM rust:1.85-slim-bullseye AS builder

WORKDIR /build

# Install build dependencies (includes capnp compiler and standard library)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    git \
    ca-certificates \
    capnproto \
    libcapnp-dev \
    && rm -rf /var/lib/apt/lists/*

# Set CAPNP_INCLUDE_PATH so capnp compiler can find standard library files
ENV CAPNP_INCLUDE_PATH=/usr/include/capnp

# Create symlink for /capnp -> /usr/include/capnp (some build scripts expect /capnp/)
RUN ln -s /usr/include/capnp /capnp || true

# Clone sv2-apps repository
# Use ARG to allow version pinning (default to main branch)
ARG SV2_APPS_VERSION=main
ARG SV2_APPS_REPO=https://github.com/stratum-mining/sv2-apps.git

RUN git clone --depth 1 --branch ${SV2_APPS_VERSION} \
    ${SV2_APPS_REPO} /build/sv2-apps

WORKDIR /build/sv2-apps

# Build jd-client binary
# The jd-client is in miner-apps/jd-client directory
WORKDIR /build/sv2-apps/miner-apps/jd-client
RUN cargo build --release || (echo "Build failed!" && exit 1)

# Find the binary location - check known locations
RUN JDC_BIN="" && \
    if [ -f /build/sv2-apps/miner-apps/target/release/jd_client_sv2 ]; then \
        JDC_BIN="/build/sv2-apps/miner-apps/target/release/jd_client_sv2"; \
    elif [ -f /build/sv2-apps/target/release/jd_client_sv2 ]; then \
        JDC_BIN="/build/sv2-apps/target/release/jd_client_sv2"; \
    else \
        echo "ERROR: JDC binary not found!" && \
        echo "Checking for binaries..." && \
        find /build/sv2-apps -name "jd_client_sv2" -type f 2>/dev/null && \
        exit 1; \
    fi && \
    echo "Found jd-client at: $JDC_BIN" && \
    mkdir -p /build/bin && \
    cp "$JDC_BIN" /build/bin/jd-client && \
    chmod +x /build/bin/jd-client && \
    ls -lh /build/bin/jd-client

# Runtime stage
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder (from the location we found during build)
COPY --from=builder /build/bin/jd-client /app/jd-client

# Make binary executable
RUN chmod +x /app/jd-client

# Default command - expects config file at /etc/jdc/jdc-config.toml
# The jd-client binary accepts --config flag for configuration file path
CMD ["/app/jd-client", "--config", "/etc/jdc/jdc-config.toml"]
