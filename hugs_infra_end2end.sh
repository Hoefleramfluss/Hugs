#!/usr/bin/env bash
set -euo pipefail

ts() { date +"[%Y-%m-%d %H:%M:%S]"; }

PROJECT_ID="hugs-headshop-20251108122937"
TF_DIR="infra"

echo "$(ts) 0) Kontext & Verzeichnis-Check"
echo "-- pwd --"
pwd
echo
echo "-- ls --"
ls
echo

if [ ! -d "${TF_DIR}" ]; then
  echo "$(ts) FEHLER: Verzeichnis '${TF_DIR}' nicht gefunden. Bitte im Hugs_CRM-Projektroot ausführen."
  exit 1
fi

if [ ! -f "${TF_DIR}/main.tf" ]; then
  echo "$(ts) FEHLER: In '${TF_DIR}' wurde keine main.tf gefunden. Terraform-Konfiguration prüfen."
  exit 1
fi

echo "$(ts) 0.1) Terraform-Version"
terraform -version
echo

echo "$(ts) 1) gcloud-Account & -Konfiguration anzeigen"
gcloud --version
echo
gcloud auth list
echo
gcloud config list
echo

echo "$(ts) 1.1) Projekt & Run-Region hart auf PROD setzen"
gcloud config set core/project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "europe-west3" >/dev/null

echo
echo "$(ts) 1.2) Konfiguration nach Anpassung"
gcloud config list
echo

echo "$(ts) 2) Application Default Credentials (ADC) für Terraform reparieren"
echo "$(ts) 2.1) Bestehende ADC zurücksetzen (revoke + Datei löschen, falls vorhanden)"

gcloud auth application-default revoke --quiet || true
ADC_FILE="${HOME}/.config/gcloud/application_default_credentials.json"
if [ -f "${ADC_FILE}" ]; then
  echo "$(ts) 2.1) Entferne ${ADC_FILE}"
  rm -f "${ADC_FILE}"
fi

echo
echo "$(ts) 2.2) ADC neu setzen via 'gcloud auth application-default login'"
echo "      -> Im Browser mit demselben Konto einloggen wie oben aktiv (z.B. hoefler@amfluss.info)."
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform

echo
echo "$(ts) 2.3) Test: Access Token für ADC ziehen (erste Zeichen als Sichtprüfung)"
TOKEN_SAMPLE="$(gcloud auth application-default print-access-token | head -c 20 || true)"
if [ -n "${TOKEN_SAMPLE}" ]; then
  echo "$(ts) ADC-Token (erste 20 Zeichen): ${TOKEN_SAMPLE}..."
else
  echo "$(ts) WARNUNG: Konnte kein ADC-Token abrufen. Terraform wird vermutlich wieder scheitern."
fi
echo

echo "$(ts) 3) Terraform init im Verzeichnis '${TF_DIR}'"
cd "${TF_DIR}"
echo "-- pwd (Terraform) --"
pwd
echo

terraform init

echo
echo "$(ts) 3.1) Terraform-Plan (nur Lesen, kein Apply)"
terraform plan -var-file=terraform.tfvars || {
  echo
  echo "$(ts) WARNUNG: 'terraform plan' ist fehlgeschlagen. Ausgabe oben prüfen."
  echo "         Skript läuft weiter zu den State-Checks, es wird aber nichts angewendet."
}

echo
echo "$(ts) 4) Terraform-State-Checks & optionaler Import"

echo
echo "$(ts) 4.1) Aktuelle Ressourcen im Terraform-State (Auszug)"
terraform state list || {
  echo "$(ts) HINWEIS: 'terraform state list' fehlgeschlagen (evtl. leerer State?)."
}

echo
echo "$(ts) 4.2) Prüfe, ob 'google_sql_user.app' bereits im State vorhanden ist"
if terraform state list 2>/dev/null | grep -q '^google_sql_user\.app$'; then
  echo "$(ts) -> google_sql_user.app ist bereits im State."
else
  echo "$(ts) -> google_sql_user.app fehlt im State. Import wird ausgeführt."
  echo "$(ts)    terraform import google_sql_user.app projects/${PROJECT_ID}/instances/hugs-pg-instance-prod/users/shopuser"
  terraform import google_sql_user.app "projects/${PROJECT_ID}/instances/hugs-pg-instance-prod/users/shopuser" || {
    echo "$(ts) WARNUNG: Import von google_sql_user.app fehlgeschlagen. Manuell prüfen."
  }
fi

echo
echo "$(ts) 4.3) Prüfe, ob 'google_project_service.apis[\"run.googleapis.com\"]' im State vorhanden ist"
if terraform state list 2>/dev/null | grep -q 'google_project_service\.apis\["run.googleapis.com"\]'; then
  echo "$(ts) -> google_project_service.apis[\"run.googleapis.com\"] ist bereits im State."
else
  echo "$(ts) -> google_project_service.apis[\"run.googleapis.com\"] fehlt im State. Import wird ausgeführt."
  echo "$(ts)    terraform import 'google_project_service.apis[\"run.googleapis.com\"]' projects/${PROJECT_ID}/services/run.googleapis.com"
  terraform import 'google_project_service.apis["run.googleapis.com"]' "projects/${PROJECT_ID}/services/run.googleapis.com" || {
    echo "$(ts) WARNUNG: Import von google_project_service.apis[\"run.googleapis.com\"] fehlgeschlagen. Manuell prüfen."
  }
fi

echo
echo "$(ts) 4.4) State nach Import erneut anzeigen (nur relevante Ressourcen)"
terraform state list 2>/dev/null | grep -E 'google_sql_user\.app|google_project_service\.apis\["run.googleapis.com"\]' || true

echo
echo "$(ts) 5) Abschlusshinweis"
echo " - Es wurde KEIN 'terraform apply' ausgeführt."
echo " - Es wurden KEINE Prisma-Migrationen gestartet."
echo " - Backend-Auth (ADC) ist neu gesetzt; 'terraform init' sollte damit funktionieren."
echo " - Der State enthält nun (sofern die Importe erfolgreich waren):"
echo "     * google_sql_user.app"
echo "     * google_project_service.apis[\"run.googleapis.com\"]"
echo
echo "$(ts) Bitte den obigen Plan/State manuell reviewen, bevor irgendetwas angewendet wird."
