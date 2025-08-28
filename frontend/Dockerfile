FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

# Build args (defaults to localhost for development)
ARG API_BASE_URL=http://localhost:3000
ARG API_WS_URL=ws://localhost:3000/ws

# Replace URLs in config if different from localhost
RUN if [ "$API_BASE_URL" != "http://localhost:3000" ]; then \
        sed -i "s|http://localhost:3000|${API_BASE_URL}|g" config.ts; \
    fi && \
    if [ "$API_WS_URL" != "ws://localhost:3000/ws" ]; then \
        sed -i "s|ws://localhost:3000/ws|${API_WS_URL}|g" config.ts; \
    fi

RUN npm run build

CMD cp -r /app/dist/* /app/output/