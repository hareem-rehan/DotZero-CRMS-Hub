#!/usr/bin/env bash
set -e

echo "==> Installing root dependencies (zod, @prisma/client, ts-node for seed)..."
npm install --include=dev

echo "==> Installing server dependencies (includes @types/*)..."
cd server
npm install --include=dev

echo "==> Generating Prisma client (must run before tsc)..."
npx prisma generate --schema ../prisma/schema.prisma

echo "==> Copying generated Prisma client to root node_modules (for seed)..."
mkdir -p ../node_modules/.prisma
cp -r ./node_modules/.prisma/client ../node_modules/.prisma/client

echo "==> Compiling TypeScript..."
npm run build

echo "==> Running database migrations..."
npx prisma migrate deploy --schema ../prisma/schema.prisma

echo "==> Seeding database (upsert — safe to re-run)..."
cd ..
npx prisma db seed

echo "==> Build complete ✓"
