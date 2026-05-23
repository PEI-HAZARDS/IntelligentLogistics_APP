FROM node:22-alpine

# Set working directory inside the container — Metro resolves
# '../packages/shared' relative to here, so shared lands at /packages/shared.
WORKDIR /app

# Install deps first (layer cached unless package files change)
COPY intelligent-logistics-driver/package.json intelligent-logistics-driver/package-lock.json* ./
RUN npm install

# Copy the shared package where Metro expects it (/packages/shared)
COPY packages/shared /packages/shared

# Copy the rest of the driver source
COPY intelligent-logistics-driver/ .

EXPOSE 8082

CMD ["npm", "start", "--", "--port", "8082"]
