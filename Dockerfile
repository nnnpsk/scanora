# Node.js image
FROM node:22-alpine

# Working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy node_modules 
COPY node_modules ./node_modules

# Copy all source code
COPY . .

# CLI entry point-executable
RUN chmod +x ./bin/scano.js

# Link the CLI  
RUN npm link

# open interactive shell
CMD [ "sh" ]
