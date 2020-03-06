FROM node:10
WORKDIR /usr/src/app
COPY . .
RUN npm install
EXPOSE 7073
CMD [ "node", "home_automation.js" ]
