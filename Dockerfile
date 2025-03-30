# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports for proxy and UI servers
EXPOSE 8000 8080

# Set default environment variables
ENV PORT=8000 \
    UI_PORT=8080 \
    TARGET_URL=http://localhost:12434

# Start the application
CMD ["node", "server/index.js"] 