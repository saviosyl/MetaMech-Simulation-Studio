#!/usr/bin/env bash
# Idempotent dependency install + build for the Cloud Agent dev environment.
# Runs from the repository root after checkout. Must terminate (no servers here).
#
# We use `npm ci` (clean install from the lockfile) rather than `npm install`.
# The repository commits node_modules, but inconsistently (e.g. the frontend's
# node_modules/.bin symlinks are not committed). `npm install` on top of the
# pre-existing tree leaves those bin symlinks missing, so `vite` is not found.
# `npm ci` wipes node_modules and rebuilds it deterministically, restoring the
# .bin symlinks every run.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Installing root dependencies =="
npm ci --no-audit --no-fund

echo "== Installing backend dependencies =="
npm --prefix backend ci --no-audit --no-fund

echo "== Building backend (tsc) =="
npm --prefix backend run build

echo "== Installing frontend dependencies =="
npm --prefix frontend ci --no-audit --no-fund

echo "== Install complete =="
