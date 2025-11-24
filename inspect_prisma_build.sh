#!/usr/bin/env bash
set -euo pipefail

# --- Parameterisierung --------------------------------------------------------
PROJECT_ID="hugs-headshop-20251108122937"
# Optional: BUILD_ID als 1. Argument überschreiben, sonst Default verwenden
BUILD_ID="${1:-1f0c2f7e-4da2-4ea6-8347-caf11974d231}"

echo "== 0) Kontext: Projekt & Build-ID =="
echo "PROJECT_ID: ${PROJECT_ID}"
echo "BUILD_ID   : ${BUILD_ID}"
echo

# --- 1) Build-Metadaten & Steps ----------------------------------------------
echo "== 1) Build-Metadaten & Steps =="
gcloud builds describe "${BUILD_ID}" \
  --project="${PROJECT_ID}" \
  --format="yaml(
    status,
    logUrl,
    steps.name,
    steps.id,
    steps.status,
    steps.timing
  )"

echo
echo "Hinweis: Oben siehst du explizit, ob der Step 'Run Prisma migrations'"
echo "als eigener Step gelistet ist und welchen Status er hat."
echo

# --- 2) Vollständiges Build-Log ----------------------------------------------
echo "== 2) Vollständiges Build-Log =="
echo "(Direkte Ausgabe von 'gcloud builds log', ohne tail/Flags)"
echo

# WICHTIG: korrektes Kommando ist 'gcloud builds log <BUILD_ID>'
gcloud builds log "${BUILD_ID}" \
  --project="${PROJECT_ID}"

# --- 3) Prisma-bezogene Ausschnitte herausfiltern ----------------------------
echo
echo "== 3) Prisma-/Migrations-relevante Logzeilen (gefilterter Ausschnitt) =="
echo "(Falls nichts gefunden wird, ist das ok – dann bitte Abschnitt 2 sichten.)"
echo

# Nur Standard-Tools verwenden (grep), kein 'rg' o. Ä.
gcloud builds log "${BUILD_ID}" \
  --project="${PROJECT_ID}" \
  | grep -n -E 'Run Prisma migrations|prisma migrate|P10[0-9]{2}|P20[0-9]{2}' || true

echo
echo "== Done =="
echo "Wenn du die Root Cause analysieren oder teilen möchtest:"
echo "- Relevante Fehlermeldung kommt typischerweise aus dem 'Run Prisma migrations'-Step"
echo "- Häufig: Prisma Fehlercode (z.B. P1000, P1010, P2022 etc.) + SQL-Detail."
