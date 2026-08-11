#!/usr/bin/env bash
# Idempotent dependency install + build for the Cloud Agent dev environment.
# Runs from the repository root after checkout. Must terminate (no servers here).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Installing root dependencies =="
npm install --no-audit --no-fund

echo "== Installing backend dependencies =="
npm --prefix backend install --no-audit --no-fund

echo "== Building backend (tsc) =="
npm --prefix backend run build

echo "== Installing frontend dependencies =="
npm --prefix frontend install --no-audit --no-fund

echo "== Install complete =="
