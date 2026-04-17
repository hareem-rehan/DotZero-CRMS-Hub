#!/usr/bin/env bash
set -e

echo "==> Installing client dependencies..."
cd client
npm install --include=dev

echo "==> Building Next.js app..."
npm run build

echo "==> Build complete ✓"
