#!/usr/bin/env bash
# Per-boot startup for the Cloud Agent dev environment. Brings up PostgreSQL,
# applies migrations, then runs the backend and frontend dev servers attached.
# Idempotent: safe to run on every container start.
set -euo pipefail

cd "$(dirname "$0")/.."

PG_HOST="127.0.0.1"
PG_PORT="5432"
DB_NAME="metamech_studio"

echo "== Ensuring PostgreSQL 16 cluster is running =="
if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
  sudo pg_ctlcluster 16 main start || true
fi

echo "== Waiting for PostgreSQL to accept connections =="
for _ in $(seq 1 30); do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
    break
  fi
  sleep 1
done
pg_isready -h "$PG_HOST" -p "$PG_PORT"

echo "== Ensuring database role password and database exist =="
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
fi

echo "== Applying backend migrations =="
npm --prefix backend run migrate

echo "== Starting backend (port 3000) and frontend (port 5173) dev servers =="
export VITE_API_URL="${VITE_API_URL:-http://localhost:3000}"

npm --prefix backend run dev &
npm --prefix frontend run dev &

# Stay attached so the container start process supervises both dev servers.
wait
