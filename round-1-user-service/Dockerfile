FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create SQLite data dir
RUN mkdir -p data

EXPOSE 54321

CMD ["npx", "ts-node", "src/index.ts"]
