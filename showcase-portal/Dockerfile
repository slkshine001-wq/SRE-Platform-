FROM node:20-alpine

WORKDIR /app

# Install live-server globally
RUN npm install -g live-server

COPY . .

EXPOSE 8080

CMD ["live-server", "--port=8080", "--host=0.0.0.0", "--no-browser", "."]
