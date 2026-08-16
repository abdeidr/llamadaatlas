FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 80
EXPOSE 3000
EXPOSE 8080

CMD ["node", "server.js"]
