#!/usr/bin/env bash
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-hugs-headshop-20251108122937}"
GCP_REGION="${GCP_REGION:-europe-west3}"
SERVICE_NAME="${SERVICE_NAME:-hugs-backend-prod}"
LOG_FILE="${LOG_FILE:-.deploy-info-1762969030/cloudrun-backend-logs.txt}"

OUT_DIR="${OUT_DIR:-.deploy-info-$(date +%s)}"
mkdir -p "$OUT_DIR"

DESC_FILE="$OUT_DIR/${SERVICE_NAME}-describe.yaml"
LOG_TAIL_FILE="$OUT_DIR/${SERVICE_NAME}-logs-tail.txt"
SUMMARY_FILE="$OUT_DIR/${SERVICE_NAME}-log-summary.txt"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "WARN: gcloud nicht gefunden. Überspringe Remote-Abfragen." >&2
else
  echo "[1/3] gcloud run services describe -> $DESC_FILE"
  gcloud run services describe "$SERVICE_NAME" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT" \
    --format=yaml > "$DESC_FILE"

  echo "[2/3] gcloud run services logs read (200 Zeilen) -> $LOG_TAIL_FILE"
  gcloud run services logs read "$SERVICE_NAME" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT" \
    --limit=200 > "$LOG_TAIL_FILE"
fi

if [ -f "$LOG_FILE" ]; then
  echo "[3/3] Lokale Log-Analyse ($LOG_FILE) -> $SUMMARY_FILE"
  {
    echo "== Fehlerzeilen (Status >=400 oder Schlüsselwörter) =="
    grep -E "ERROR|panic|trace|404|500|Exception|stack" "$LOG_FILE" || echo "<keine Treffer>"

    echo
    echo "== HTTP-Fehler nach Pfad =="
    awk 'match($0, /GET ([0-9]{3}) https?:\/\/[^\/]+(\/[^"]*)/, arr) {
      code = arr[1]; path = arr[2];
      if (code ~ /^(4|5)/) counts[path]++
    }
    END {
      if (!counts[path]) { print "<keine 4xx/5xx Pfade gefunden>"; exit }
      for (p in counts) printf "%s %d\n", p, counts[p]
    }' "$LOG_FILE"

    echo
    echo "== Restart- oder Probe-Indikatoren =="
    if grep -qi "(Container started|Container failed|CrashLoop|unhealthy|readiness|liveness)" "$LOG_FILE"; then
      grep -i "Container started\|Container failed\|CrashLoop\|unhealthy\|readiness\|liveness" "$LOG_FILE"
    else
      echo "<keine Restart/Probe-Treffer>"
    fi
  } > "$SUMMARY_FILE"
else
  echo "WARN: Log-Datei $LOG_FILE nicht gefunden." >&2
fi

echo "Fertig. Artefakte:"
echo "  Describe: ${DESC_FILE:-<übersprungen>}"
echo "  Logs tail: ${LOG_TAIL_FILE:-<übersprungen>}"
echo "  Zusammenfassung: ${SUMMARY_FILE:-<übersprungen>}"
