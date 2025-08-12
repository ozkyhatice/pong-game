all:
	@echo "\033[35m🚀 Starting Pong Game Development Environment...\033[0m"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	make backend-bg & \
	make frontend-bg & \
	make websocket-test-bg & \
	wait

backend-bg:
	@echo "\033[32m🔧 Starting backend server in background...\033[0m"
	@cd backend && npm install --silent && npm run dev
	@echo "\033[32m✅ Backend ready at http://localhost:3000\033[0m"

frontend-bg:
	@echo "\033[34m🎮 Starting frontend server in background...\033[0m"
	@cd frontend-v2 && npm install --silent && npm run dev &
	@echo "\033[34m✅ Frontend ready at http://localhost:8080\033[0m"

websocket-test-bg:
	@echo "\033[35m🔌 Starting websocket test app in background...\033[0m"
	@cd websocket-test-app && npm install --silent && npm run dev
	@echo "\033[35m✅ WebSocket test app ready at http://localhost:8081\033[0m"

clean:
	@echo "\033[33m🧹 Cleaning up node_modules and dist folders...\033[0m"
	@cd backend && rm -rf node_modules
	@cd frontend-v2 && rm -rf node_modules dist
	@cd websocket-test-app && rm -rf node_modules dist
	@echo "\033[31m🗑️  Removing database file...\033[0m"
	@cd backend && rm -f dev.db
	@echo "\033[32m✅ Cleanup completed!\033[0m"

kill:
	@echo "\033[31m💀 Killing running processes...\033[0m"
	@echo "\033[35m🔪 Stopping Node.js processes...\033[0m"
	-pkill -f "node.*dev"
	-pkill -f "npm.*dev"
	@echo "\033[36m🐍 Stopping Python HTTP servers...\033[0m"
	-pkill -f "python3 -m http.server"
	@echo "\033[33m🚪 Stopping processes on common ports...\033[0m"
	-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	-lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@echo "\033[32m🎉 All processes killed successfully!\033[0m"

clean-db:
	@echo "\033[31m🗑️  Removing database file...\033[0m"
	@cd backend && rm -f dev.db
	@echo "\033[32m✅ Database cleaned!\033[0m"

fclean: kill clean
	@echo "\033[35m🌟 Full cleanup completed! Ready for fresh start! 🌟\033[0m"

help:
	@echo "\033[35m🎮 PONG GAME DEVELOPMENT COMMANDS 🎮\033[0m"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@echo "\033[36m🚀 make all           \033[0m- Start all services in background"
	@echo "\033[32m🔧 make backend       \033[0m- Start only backend server (foreground)"
	@echo "\033[32m🔧 make backend-bg    \033[0m- Start only backend server (background)"
	@echo "\033[34m🎨 make frontend      \033[0m- Start only frontend server (background)"
	@echo "\033[34m🎨 make frontend-bg   \033[0m- Start only frontend server (background)"
	@echo "\033[35m🔌 make websocket-test\033[0m- Start only websocket test app (foreground)"
	@echo "\033[35m🔌 make websocket-test-bg\033[0m- Start only websocket test app (background)"
	@echo "\033[33m🧹 make clean         \033[0m- Remove node_modules and dist folders"
	@echo "\033[31m🗑️  make clean-db      \033[0m- Remove database file only"
	@echo "\033[31m💀 make kill          \033[0m- Kill all running processes"
	@echo "\033[36m📊 make status        \033[0m- Check running services status"
	@echo "\033[35m🌟 make fclean        \033[0m- Full cleanup (kill + clean)"
	@echo "\033[36m❓ make help          \033[0m- Show this help message"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@echo "\033[36m📊 MONITORING COMMANDS 📊\033[0m"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@echo "\033[36m📈 make monitoring-up     \033[0m- Start Prometheus & Grafana"
	@echo "\033[31m📉 make monitoring-down   \033[0m- Stop monitoring services"
	@echo "\033[33m🔄 make monitoring-restart\033[0m- Restart monitoring services"
	@echo "\033[35m📋 make monitoring-logs   \033[0m- Show monitoring logs"
	@echo "\033[36m📊 make monitoring-status \033[0m- Check monitoring status"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@echo "\033[36m🐳 DOCKER COMMANDS 🐳\033[0m"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
	@echo "\033[36m🚀 make docker-up        \033[0m- Start all services with Docker"
	@echo "\033[31m🛑 make docker-down      \033[0m- Stop all Docker services"
	@echo "\033[33m🔄 make docker-restart   \033[0m- Restart all Docker services"
	@echo "\033[33m🔨 make docker-build     \033[0m- Build all Docker images"
	@echo "\033[33m⚡ make docker-rebuild   \033[0m- Rebuild and restart all services"
	@echo "\033[35m📋 make docker-logs      \033[0m- Show Docker services logs"
	@echo "\033[36m📊 make docker-status    \033[0m- Check Docker services status"
	@echo "\033[31m🧹 make docker-clean     \033[0m- Clean Docker containers & images"
	@echo "\033[35m🌟 make docker-full-up   \033[0m- Start ALL (App + Monitoring)"
	@echo "\033[31m🌟 make docker-full-down \033[0m- Stop ALL (App + Monitoring)"
	@echo "\033[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"

re: fclean all
	@echo "\033[35m🔄 Rebuilding and restarting all services...\033[0m"

# Monitoring commands
monitoring-up:
	@echo "\033[36m📊 Starting monitoring services (Prometheus & Grafana)...\033[0m"
	@cd monitoring && docker-compose up -d
	@echo "\033[32m✅ Monitoring services started!\033[0m"
	@echo "\033[36m📈 Prometheus: http://localhost:9090\033[0m"
	@echo "\033[36m📊 Grafana: http://localhost:3001 (admin/admin)\033[0m"

monitoring-down:
	@echo "\033[31m📊 Stopping monitoring services...\033[0m"
	@cd monitoring && docker-compose down
	@echo "\033[32m✅ Monitoring services stopped!\033[0m"

monitoring-logs:
	@echo "\033[36m📋 Showing monitoring services logs...\033[0m"
	@cd monitoring && docker-compose logs -f

monitoring-restart:
	@echo "\033[33m🔄 Restarting monitoring services...\033[0m"
	@cd monitoring && docker-compose restart
	@echo "\033[32m✅ Monitoring services restarted!\033[0m"

monitoring-status:
	@echo "\033[36m📊 Checking monitoring services status...\033[0m"
	@cd monitoring && docker-compose ps

# Docker commands
docker-up:
	@echo "\033[36m🐳 Starting all services with Docker...\033[0m"
	@docker-compose up -d
	@echo "\033[32m✅ All Docker services started!\033[0m"
	@echo "\033[34m🎮 Frontend: http://localhost:8080\033[0m"
	@echo "\033[32m🔧 Backend: http://localhost:3000\033[0m"

docker-down:
	@echo "\033[31m🐳 Stopping all Docker services...\033[0m"
	@docker-compose down
	@echo "\033[32m✅ All Docker services stopped!\033[0m"

docker-logs:
	@echo "\033[36m📋 Showing Docker services logs...\033[0m"
	@docker-compose logs -f

docker-restart:
	@echo "\033[33m🔄 Restarting all Docker services...\033[0m"
	@docker-compose restart
	@echo "\033[32m✅ All Docker services restarted!\033[0m"

docker-build:
	@echo "\033[33m🔨 Building all Docker images...\033[0m"
	@docker-compose build
	@echo "\033[32m✅ All Docker images built!\033[0m"

docker-rebuild:
	@echo "\033[33m🔨 Rebuilding and starting all Docker services...\033[0m"
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d
	@echo "\033[32m✅ All Docker services rebuilt and started!\033[0m"

docker-status:
	@echo "\033[36m🐳 Checking Docker services status...\033[0m"
	@docker-compose ps

docker-clean:
	@echo "\033[31m🧹 Cleaning Docker containers and images...\033[0m"
	@docker-compose down
	@docker system prune -f
	@echo "\033[32m✅ Docker cleanup completed!\033[0m"

# Full Docker + Monitoring
docker-full-up:
	@echo "\033[35m🚀 Starting ALL services (App + Monitoring) with Docker...\033[0m"
	@echo "\033[36m🐳 Starting main application...\033[0m"
	@docker-compose up -d
	@echo "\033[36m📊 Starting monitoring services...\033[0m"
	@cd monitoring && docker-compose up -d
	@echo "\033[32m✅ All services started!\033[0m"
	@echo "\033[34m🎮 Frontend: http://localhost:8080\033[0m"
	@echo "\033[32m🔧 Backend: http://localhost:3000\033[0m"
	@echo "\033[36m📈 Prometheus: http://localhost:9090\033[0m"
	@echo "\033[36m📊 Grafana: http://localhost:3001 (admin/admin)\033[0m"

docker-full-down:
	@echo "\033[31m🛑 Stopping ALL services (App + Monitoring)...\033[0m"
	@docker-compose down
	@cd monitoring && docker-compose down
	@echo "\033[32m✅ All services stopped!\033[0m"

.PHONY: all backend backend-bg frontend frontend-bg websocket-test websocket-test-bg clean clean-db kill status fclean help re monitoring-up monitoring-down monitoring-logs monitoring-restart monitoring-status docker-up docker-down docker-logs docker-restart docker-build docker-rebuild docker-status docker-clean docker-full-up docker-full-down
