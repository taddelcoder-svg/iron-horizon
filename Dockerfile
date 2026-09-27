FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=10000
COPY package.json server.js zugang.js datenschutz.html ./
COPY fonts ./fonts
COPY iron-horizon ./iron-horizon
EXPOSE 10000
USER node
CMD ["node", "server.js"]
