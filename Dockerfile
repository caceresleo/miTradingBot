FROM node:18

WORKDIR  /fulltradingbot

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]