# Stage 1: Build
FROM node:24-alpine AS builder

# Set the working directory
WORKDIR /home/node/app

# Copy package.json and package-lock.json and install dependencies
COPY ./backend/package*.json ./
RUN mkdir -p /home/node/common
COPY ./common /home/node/common
RUN npm ci --prefix /home/node/common/utils
RUN npm ci --prefix /home/node/common/db
RUN npm ci --prefix /home/node/common/interfaces
RUN npm ci --prefix /home/node/common/logger
RUN npm ci

# Copy the rest of the files and build the application
COPY ./backend .

# Compile TypeScript modules in the common folder
RUN npm run build --prefix /home/node/common/utils
RUN npm run build --prefix /home/node/common/db
RUN npm run build --prefix /home/node/common/interfaces
RUN npm run build --prefix /home/node/common/logger

RUN npm run build

# Stage 2: Runtime
FROM node:24-alpine

# Set the working directory
WORKDIR /home/node/app

# Copy files from the build stage
COPY --from=builder /home/node/common /home/node/common
COPY --from=builder /home/node/app/node_modules ./node_modules
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/package*.json ./

# Copy grafana dashboard templates
COPY ./grafana/templates ./grafana_templates

# Change ownership to allow access for the `node` user
RUN chown -R node:node /home/node

# Switch to the `node` user
USER node

# Start the application
CMD ["npm", "start"]
