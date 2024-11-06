FROM grafana/grafana:11.1.2
COPY ./grafana/grafana.ini /etc/grafana/grafana.ini
COPY ./grafana/dashboard.yaml /etc/grafana/provisioning/dashboards/main.yaml
COPY ./grafana/datasource.release.yaml /etc/grafana/provisioning/datasources/main.yaml