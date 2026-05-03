FROM node:20-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy entire frontend source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
