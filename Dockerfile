FROM node:20-alpine

WORKDIR /app

ENV PORT=80
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 80

CMD ["node", "server.js"]
