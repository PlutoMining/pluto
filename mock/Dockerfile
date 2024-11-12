# Fase 1: Costruzione
FROM node:20-alpine AS builder

# Imposta la directory di lavoro
WORKDIR /home/node/app

# Copia package.json e package-lock.json e installa le dipendenze
COPY ./mock/package*.json ./
RUN mkdir -p /home/node/common/logger
COPY ./common /home/node/common
RUN npm ci --prefix /home/node/common/logger
RUN npm ci --prefix /home/node/common/interfaces
RUN npm ci

# Copia il resto dei file e costruisce l'applicazione
COPY ./mock .

# Compila i moduli TypeScript nella cartella common
RUN npm run build --prefix /home/node/common/logger
RUN npm run build --prefix /home/node/common/interfaces

# Compila l'applicazione mock
RUN npm run build

# Fase 2: Runtime
FROM node:20-alpine

# Imposta la directory di lavoro
WORKDIR /home/node/app

# Copia i file necessari dalla fase di build
COPY --from=builder /home/node/common /home/node/common
COPY --from=builder /home/node/app/node_modules ./node_modules
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/package*.json ./

# Cambia proprietà per permettere l'accesso all'utente `node`
RUN chown -R node:node /home/node

# Passa all'utente `node`
USER node

# Avvia l'applicazione
CMD ["npm", "start"]
