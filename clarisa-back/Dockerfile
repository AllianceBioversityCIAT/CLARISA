#################### BASE STAGE ####################
# Alternativa: usar imagen Ubuntu si Alpine da problemas
# FROM node:20.13.1 AS base
FROM node:20.13.1-alpine AS base

# Para Alpine: instalar dependencias necesarias para compilar bcrypt
RUN apk add --no-cache python3 make g++

# Para Ubuntu (si cambias la imagen base):
# RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################
FROM base AS development

RUN npm install && npm install --save-dev @types/node

COPY . .
# RUN npm run migration:run

RUN npm run build

CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################
FROM base AS build
RUN npm ci --only=production
COPY . .
RUN npm run build

#################### PRODUCTION STAGE ####################
FROM --platform=linux/amd64 node:20.13.1-alpine AS production

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]