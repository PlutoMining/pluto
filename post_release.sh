# Creazione della cartella dist/store se non esiste
mkdir -p dist/store/bemind-pluto/data
mkdir -p dist/store/bemind-pluto-dev/data

# Aggiunta di file .gitkeep nelle cartelle data
touch dist/store/bemind-pluto/data/.gitkeep
touch dist/store/bemind-pluto-dev/data/.gitkeep

# Copia di docker-compose.yml e umbrel-app.yml nelle rispettive cartelle
cp docker-compose.yml dist/store/bemind-pluto/
cp docker-compose.yml dist/store/bemind-pluto-dev/
cp umbrel-app.yml dist/store/bemind-pluto/
cp umbrel-app.yml dist/store/bemind-pluto-dev/

# Modifiche specifiche per bemind-pluto
# Rimozione del servizio mock e impostazione di DETECT_MOCK_DEVICES a false
sed -i '' '/mock:/,/depends_on:/d' dist/store/bemind-pluto/docker-compose.yml
sed -i '' -E "s/(DETECT_MOCK_DEVICES:) true/\1 false/" dist/store/bemind-pluto/docker-compose.yml

# Modifiche specifiche per bemind-pluto-dev
# Sostituzione di "bemind-pluto" con "bemind-pluto-dev" in umbrel-app.yml
sed -i '' -E "s/bemind-pluto/bemind-pluto-dev/g" dist/store/bemind-pluto-dev/umbrel-app.yml

# Modifica del nome dell'app da "Pluto" a "Pluto Dev" in umbrel-app.yml per bemind-pluto-dev
sed -i '' -E "s/name: \"Pluto\"/name: \"Pluto Dev\"/g" dist/store/bemind-pluto-dev/umbrel-app.yml

echo "Cartelle dist/store/bemind-pluto e dist/store/bemind-pluto-dev create e configurate con successo."
