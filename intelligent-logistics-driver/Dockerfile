FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json package-lock.json* ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port Expo uses
EXPOSE 8082

# Command to start the Expo server
CMD ["npm", "start", "--", "--port", "8082"]