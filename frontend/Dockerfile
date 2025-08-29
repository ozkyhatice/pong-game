FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

# Build args (defaults to localhost for development)
ARG API_BASE_URL=http://localhost:3000
ARG API_WS_URL=ws://localhost:3000/ws

RUN npm run build

CMD cp -r /app/dist/* /app/output/