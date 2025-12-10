# Build SV2 Translator from sv2-apps source
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

# Build translator binary
# The translator is in miner-apps/translator directory
WORKDIR /build/sv2-apps/miner-apps/translator
RUN cargo build --release || (echo "Build failed!" && exit 1)

# Find the binary location - check known locations
RUN TRANSLATOR_BIN="" && \
    if [ -f /build/sv2-apps/miner-apps/target/release/translator_sv2 ]; then \
        TRANSLATOR_BIN="/build/sv2-apps/miner-apps/target/release/translator_sv2"; \
    elif [ -f /build/sv2-apps/target/release/translator_sv2 ]; then \
        TRANSLATOR_BIN="/build/sv2-apps/target/release/translator_sv2"; \
    else \
        echo "ERROR: Translator binary not found!" && \
        echo "Checking for binaries..." && \
        find /build/sv2-apps -name "translator_sv2" -type f 2>/dev/null && \
        exit 1; \
    fi && \
    echo "Found translator at: $TRANSLATOR_BIN" && \
    mkdir -p /build/bin && \
    cp "$TRANSLATOR_BIN" /build/bin/translator && \
    chmod +x /build/bin/translator && \
    ls -lh /build/bin/translator

# Runtime stage
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder (from the location we found during build)
COPY --from=builder /build/bin/translator /app/translator

# Make binary executable
RUN chmod +x /app/translator

# Default command - expects config file at /etc/translator/tproxy-config.toml
# The translator binary accepts --config flag for configuration file path
CMD ["/app/translator", "--config", "/etc/translator/tproxy-config.toml"]
