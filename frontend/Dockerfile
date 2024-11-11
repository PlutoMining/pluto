# Fase 1: Costruzione
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json e installa le dipendenze
COPY ./frontend/package*.json ./
RUN mkdir -p /common
COPY ./common /common
RUN npm ci --prefix /common/utils
RUN npm ci --prefix /common/interfaces
RUN npm ci

# Copia il resto dei file e costruisce l'applicazione
COPY ./frontend .

# ARG GF_HOST
# ENV GF_HOST=$GF_HOST
# ARG BACKEND_DESTINATION_HOST
# ENV BACKEND_DESTINATION_HOST=$BACKEND_DESTINATION_HOST
ARG NEXT_PUBLIC_WS_PORT
ENV NEXT_PUBLIC_WS_PORT=$NEXT_PUBLIC_WS_PORT

# Compila il modulo TypeScript `common/utils`
RUN npm run build --prefix /common/utils

# Compila il modulo TypeScript `common/interfaces`
RUN npm run build --prefix /common/interfaces

RUN npm run build

# Fase 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copia solo i file necessari dalla fase di build
COPY --from=builder /common /common
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Avvia l'applicazione
CMD ["npm", "start"]
