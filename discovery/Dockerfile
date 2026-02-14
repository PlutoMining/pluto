# Stage 1: Build
FROM node:24-alpine AS builder

# Install python3 for generating the pyasic-bridge TypeScript client
RUN apk add --no-cache python3

# Set the working directory
WORKDIR /home/node/app

# Copy tooling directory early (needed for tsconfig.base.json used by common packages)
RUN mkdir -p /home/node/tooling
COPY ./tooling /home/node/tooling

# Copy package.json and package-lock.json and install dependencies
COPY ./discovery/package*.json ./
RUN mkdir -p /home/node/common
COPY ./common /home/node/common
RUN npm ci --prefix /home/node/common/db
RUN npm ci --prefix /home/node/common/interfaces
RUN npm ci --prefix /home/node/common/logger
RUN npm ci --prefix /home/node/common/pyasic-bridge-client
RUN npm ci

# Copy the rest of the files and build the application
COPY ./discovery .

# Compile TypeScript modules in the common folder
RUN npm run build --prefix /home/node/common/db
RUN npm run build --prefix /home/node/common/interfaces
RUN npm run build --prefix /home/node/common/logger
RUN npm run build --prefix /home/node/common/pyasic-bridge-client

# Build the discovery application
RUN npm run build

# Stage 2: Runtime
FROM node:24-alpine

# Install arp-scan and libcap
# Note: In ARM64 QEMU emulation, busybox triggers may fail, but packages install correctly
# We update apk first, install packages, and verify installation succeeded
RUN apk update && \
    apk add --no-cache arp-scan libcap 2>&1 || true && \
    test -f /usr/bin/arp-scan && (test -f /usr/sbin/setcap || test -f /sbin/setcap) && \
    apk cache clean

# Set the working directory
WORKDIR /home/node/app

# Copy necessary files from the build stage
COPY --from=builder /home/node/common /home/node/common
COPY --from=builder /home/node/app/node_modules ./node_modules
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/package*.json ./

# Change ownership to allow access for the `node` user
RUN chown -R node:node /home/node

# Grant network permissions to the arp-scan binary for non-root user
RUN setcap cap_net_raw,cap_net_admin=eip /usr/bin/arp-scan

# Switch to the `node` user
USER node

# Start the application
CMD ["npm", "start"]
