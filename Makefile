all:
	@echo "Starting backend and frontend in background..."
	make backend &
	make frontend &
	wait

backend:
	@echo "Starting backend..."
	cd backend && npm install && npm run dev

frontend:
	@echo "Starting frontend..."
	cd frontend && npm install && npm run dev

clean:
	@echo "Cleaning up..."
	cd backend && rm -rf node_modules
	cd frontend && rm -rf node_modules

kill:
	@echo "Killing running processes..."
	@echo "Stopping Node.js processes..."
	-pkill -f "node.*dev"
	-pkill -f "npm.*dev"
	@echo "Stopping frontend processes..."
	-pkill -f "vite"
	-pkill -f "webpack"
	-pkill -f "parcel"
	-pkill -f "rollup"
	@echo "Stopping processes on common ports..."
	-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	-lsof -ti:4173 | xargs kill -9 2>/dev/null || true
	-lsof -ti:5000 | xargs kill -9 2>/dev/null || true
	-lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	-lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@echo "Processes killed successfully!"

fclean: kill clean
	@echo "Full cleanup completed!"
