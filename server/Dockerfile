FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV PORT=50080
EXPOSE 50080

CMD ["npm", "start"]
