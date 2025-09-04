FROM node:24-alpine

RUN apk update && apk upgrade

WORKDIR /app

COPY . .

RUN npm install

RUN mkdir -p uploads db 

EXPOSE 3000

CMD ["npm", "start"]