FROM node:20-alpine

# Set working directory
WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package.json package-lock.json /app/
RUN npm install

# Copy source code
COPY . /app

ENTRYPOINT ["npm", "start"]
