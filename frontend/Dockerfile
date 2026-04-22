FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

# VITE_API_URL is baked into the bundle at build time. Railway (and any
# other host) can override it via --build-arg / build env.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


FROM nginx:alpine AS runtime

# The official nginx image auto-runs `envsubst` over every file in
# /etc/nginx/templates/ before starting, writing the result to
# /etc/nginx/conf.d/. That lets us interpolate $PORT at container start.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Strip the distro's default server so it doesn't fight ours over port 80.
RUN rm /etc/nginx/conf.d/default.conf || true

COPY --from=build /app/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
