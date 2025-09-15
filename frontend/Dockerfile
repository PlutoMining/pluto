# Fase 1: Costruzione
FROM node:24-alpine AS builder

# Imposta la directory di lavoro
WORKDIR /home/node/app

# Copia package.json e package-lock.json e installa le dipendenze
COPY ./frontend/package*.json ./
RUN mkdir -p /home/node/common
COPY ./common /home/node/common
RUN npm ci --prefix /home/node/common/utils
RUN npm ci --prefix /home/node/common/interfaces
RUN npm ci

# Copia il resto dei file e costruisce l'applicazione
COPY ./frontend .

# Compila i moduli TypeScript nella cartella common
RUN npm run build --prefix /home/node/common/utils
RUN npm run build --prefix /home/node/common/interfaces

# Compila l'applicazione frontend
RUN npm run build

# Fase 2: Runtime
FROM node:24-alpine

# Imposta la directory di lavoro
WORKDIR /home/node/app

# Copia solo i file necessari dalla fase di build
COPY --from=builder /home/node/common /home/node/common
COPY --from=builder /home/node/app/package*.json ./
COPY --from=builder /home/node/app/.next ./.next
COPY --from=builder /home/node/app/public ./public
COPY --from=builder /home/node/app/node_modules ./node_modules

# Cambia proprietà per permettere l'accesso all'utente `node`
RUN chown -R node:node /home/node

# Passa all'utente `node`
USER node

# Avvia l'applicazione
CMD ["npm", "start"]
