# Node.js image
FROM node:22-alpine

# Working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy node_modules from your local machine
COPY node_modules ./node_modules

# Copy all source code
COPY . .

# Ensure CLI entry point is executable
RUN chmod +x ./bin/scano.js

# Link the CLI globally so `scano` can be used in the shell
RUN npm link

# Default command: open interactive shell
CMD [ "sh" ]
