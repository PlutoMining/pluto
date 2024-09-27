# Fase 1: Costruzione
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json e installa le dipendenze
COPY ./mock/package*.json ./
RUN mkdir -p /common/logger
COPY ./common /common
RUN npm ci --prefix /common/logger
RUN npm ci --prefix /common/interfaces
RUN npm ci

# Copia il resto dei file e costruisce l'applicazione
COPY ./mock .

# Compila il modulo TypeScript `common/logger`
RUN npm run build --prefix /common/logger

# Compila il modulo TypeScript `common/interfaces`
RUN npm run build --prefix /common/interfaces

RUN npm run build

# Fase 2: Runtime
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /common /common

# Copia solo le dipendenze di produzione
COPY --from=builder /app/node_modules ./node_modules

# Copia la build TypeScript dalla fase di build
COPY --from=builder /app/dist ./dist

# Copia il package.json necessario per eseguire l'applicazione
COPY --from=builder /app/package*.json ./

# Avvia l'applicazione
CMD ["npm", "start"]
