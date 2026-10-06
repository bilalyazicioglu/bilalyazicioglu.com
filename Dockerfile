FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Git-tracked posts ship as a seed; the entrypoint copies them onto the
# content volume on first boot. BLOG_DIR_PATH then points the app at the volume.
COPY --from=builder --chown=nextjs:nodejs /app/src/content/blog ./content-seed

COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /app/data /app/content/blog \
  && chown -R nextjs:nodejs /app/data /app/content

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BLOG_DIR_PATH=/app/content/blog

# Which commit this image was built from, for /infra. .git is not in the build
# context, so scripts/deploy.sh passes these in. Declared last so a new commit
# only invalidates this layer, never the npm install or the Next.js build.
ARG GIT_SHA=""
ARG GIT_SUBJECT=""
ARG GIT_COMMIT_TIME=""
ENV GIT_SHA=$GIT_SHA \
    GIT_SUBJECT=$GIT_SUBJECT \
    GIT_COMMIT_TIME=$GIT_COMMIT_TIME

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
