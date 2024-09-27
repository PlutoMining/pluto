# Fase 1: Costruzione
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json e installa le dipendenze
COPY ./backend/package*.json ./
RUN mkdir -p /common
COPY ./common /common
RUN npm ci --prefix /common/utils
RUN npm ci --prefix /common/db
RUN npm ci --prefix /common/interfaces
RUN npm ci --prefix /common/logger
RUN npm ci

# Copia il resto dei file e costruisce l'applicazione
COPY ./backend .

# Compila il modulo TypeScript `common/utils`
RUN npm run build --prefix /common/utils
# Compila il modulo TypeScript `common/db`
RUN npm run build --prefix /common/db
# Compila il modulo TypeScript `common/interfaces`
RUN npm run build --prefix /common/interfaces
# Compila il modulo TypeScript `common/logger`
RUN npm run build --prefix /common/logger

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

# Copia i templates delle dashboard di grafana
COPY ./grafana/templates ./grafana_templates

# Avvia l'applicazione
CMD ["npm", "start"]
