FROM node:20-alpine

# Set working directory
WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

# Copy source code
COPY . /app

ENTRYPOINT ["npm", "start"]
