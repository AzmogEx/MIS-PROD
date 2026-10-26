FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL=https://mis-prod.fr
ARG CMS_DEPLOYMENT_ENVIRONMENT=production
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV CMS_DEPLOYMENT_ENVIRONMENT=$CMS_DEPLOYMENT_ENVIRONMENT
ENV NEXT_TELEMETRY_DISABLED=1
# Build has no production database, accounts, secrets, or external API calls.
RUN PAYLOAD_SECRET=isolated-build-placeholder-never-use-at-runtime CMS_SCHEMA_PUSH=false npm run build

FROM node:24.22.1-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 CMS_SCHEMA_PUSH=false
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /app/.data /app/.cms/private && chown -R node:node /app/.data /app/.cms
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
