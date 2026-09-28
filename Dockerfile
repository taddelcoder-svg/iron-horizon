FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=10000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js zugang.js olymp.js raeume.js datenschutz.html ./
COPY fonts ./fonts
COPY iron-horizon ./iron-horizon
EXPOSE 10000
USER node
CMD ["node", "server.js"]
