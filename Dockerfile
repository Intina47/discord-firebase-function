# Use an official Node.js runtime as the base image
FROM node:u14

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY discord/package*.json ./

# Install the bot's dependencies in the container
RUN npm install

# Copy the rest of the bot's source code to the working directory
COPY discord/ ./
COPY botlib/ botlib/

# Make port 3000 available to the outside world
EXPOSE 3000

# Start the bot
CMD [ "node", "server.js" ]