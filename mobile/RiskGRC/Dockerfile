# Use Node.js image for Expo development
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Expose Expo web port
EXPOSE 19006

# Start Expo dev server
CMD ["npm", "run", "web"]
