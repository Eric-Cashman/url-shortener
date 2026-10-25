# syntax=docker/dockerfile:1

###############################################################################
# Stage 1: "builder"
# Installs ALL dependencies (including dev tools like TypeScript) and compiles
# the TypeScript source into plain JavaScript in /app/dist.
###############################################################################
FROM node:22-slim AS builder

WORKDIR /app

# Copy only the dependency manifests first. Docker caches each step, so as
# long as these files don't change, it reuses the cached "npm ci" layer and
# skips re-downloading everything on every build. A big speed win.
COPY package.json package-lock.json ./

# "npm ci" installs exactly what's in the lockfile — reproducible and fast.
RUN npm ci

# Now copy the rest of the source and build it.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

###############################################################################
# Stage 2: "runtime"
# A clean, small image that contains ONLY what's needed to run the app:
# production dependencies + the compiled JS + the static frontend.
# The TypeScript compiler and dev dependencies are left behind in stage 1.
###############################################################################
FROM node:22-slim AS runtime

# Tell Node it's running in production (enables optimizations).
ENV NODE_ENV=production
WORKDIR /app

# Install ONLY production dependencies to keep the image small.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the compiled app and the static frontend from the builder stage.
COPY --from=builder /app/dist ./dist
COPY public ./public

# Create the data directory and hand ownership to the non-root "node" user.
# We do this as root (the default user at this point) because only root can
# chown. When a named volume is later mounted here, Docker preserves this
# directory's ownership, so the "node" user can create the SQLite file.
RUN mkdir -p /app/data && chown -R node:node /app

# Run as the built-in non-root "node" user instead of root. Running as
# non-root is a security best practice — if the app is ever compromised,
# the attacker doesn't get root inside the container.
USER node

# Document which port the app listens on.
EXPOSE 3000

# The database lives here; declaring it as a volume lets data persist
# across container restarts if you mount a volume to it.
ENV DB_PATH=/app/data/urls.db

# Start the compiled server.
CMD ["node", "dist/server.js"]
