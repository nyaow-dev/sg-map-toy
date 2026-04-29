FROM node:20-alpine
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# Cloud Run sets PORT automatically — default to 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
