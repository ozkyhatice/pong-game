all: generate-ssl init-data docker-up
	@echo "All services started."

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

init-data:
	@mkdir -p data data/db data/grafana data/prometheus data/frontend data/uploads
	@chmod -R 777 data

fclean: docker-down
	@rm -rf data
	@echo "All Data cleaned."

docker-purune:
	@docker container prune -f
	@docker image prune -a -f
	@docker volume prune -f
	@docker network prune -f

.PHONY: docker-up docker-down docker-logs docker-restart docker-build docker-rebuild docker-status docker-clean generate-ssl init-data all fclean docker-purge
