# =========================================================
# Etb3haly — Development Dockerfile
# Base image with Node.js 20, Blender, PrusaSlicer, and
# headless rendering libs (xvfb, libosmesa6).
# =========================================================

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------
# 1. Install system dependencies
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    # blender \
    # prusa-slicer \
    # xvfb \
    # libosmesa6 \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# 2. Install Node.js 20.x
# ---------------------------------------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# 3. Set working directory
# ---------------------------------------------------------
WORKDIR /app

# ---------------------------------------------------------
# 4. Install Node.js dependencies only
#    (code is mounted via docker-compose volumes)
# ---------------------------------------------------------
COPY package.json package-lock.json ./
RUN npm ci

# No CMD — docker-compose overrides this per service.
