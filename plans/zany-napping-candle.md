# Fix: prisma not found in Docker container

## Context
Container fails on startup with `sh: prisma: not found` because `npx prisma db push` can't find the CLI binary. This started after the dokploy & postgres migration.

## Root Cause
In the Dockerfile runner stage, `node_modules/.bin/` (which contains the `prisma` symlink) is NOT copied over. Only the `node_modules/prisma/` *package directory* is copied, but not the `.bin` symlink that `npx` relies on to find and execute the CLI.

## Fix
Add `COPY --from=builder /app/node_modules/.bin ./node_modules/.bin` to the runner stage in the Dockerfile.

**Critical file:** [Dockerfile](Dockerfile) — add line after line 48:
```dockerfile
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
```

## Verification
Rebuild and start the container — the init-db script should run `prisma db push` successfully without the "not found" error.
