# The renderer needs a real Chromium, which is why it is a container rather
# than a serverless function.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PORT=8080

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev --no-audit --no-fund

COPY src ./src

EXPOSE 8080
USER pwuser
CMD ["node", "src/server.js"]
