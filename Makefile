init-data:
	@mkdir -p data data/db data/grafana data/prometheus data/frontend data/uploads
	@chmod -R 777 data

docker-up: generate-ssl init-data
	@mkdir -p backend/db
	@docker-compose up -d
	@echo "URL: https://pong.42.fr"
	@echo "URL: https://pong-monitor.42.fr"

docker-down:
	@docker-compose down

docker-logs:
	@docker-compose logs -f

docker-restart:
	@docker-compose restart

docker-build:
	@docker-compose build

docker-rebuild: generate-ssl init-data
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d

docker-status:
	@docker-compose ps

docker-clean:
	@docker-compose down
	@docker system prune -f

generate-ssl:
	@cd nginx/ssl && chmod +x generate-ssl.sh && ./generate-ssl.sh

.PHONY: docker-up docker-down docker-logs docker-restart docker-build docker-rebuild docker-status docker-clean generate-ssl init-data
