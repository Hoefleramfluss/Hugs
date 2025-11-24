#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Hugs Terraform Automatisierung
# - findet das Terraform-Infra-Verzeichnis
# - führt einen ersten Plan aus (read-only)
# - prüft Terraform-State auf:
#     * google_sql_user.app
#     * google_project_service.apis["run.googleapis.com"]
# - importiert fehlende Ressourcen in den State
# - führt danach erneut einen Plan aus (read-only)
# WICHTIG: Kein terraform apply, keine Prisma-Migrationen.
###############################################################################

PROJECT_ID="hugs-headshop-20251108122937"
SQL_INSTANCE="hugs-pg-instance-prod"
SQL_USER="shopuser"
RUN_API_SERVICE="run.googleapis.com"

echo "== 0) Kontext & Basischecks =="

echo "-- 0.1) Aktuelles Verzeichnis --"
pwd
echo

echo "-- 0.2) Inhalt des aktuellen Verzeichnisses --"
ls
echo

echo "-- 0.3) Terraform-Version --"
if ! command -v terraform >/dev/null 2>&1; then
  echo "FEHLER: terraform ist nicht im PATH. Bitte Terraform installieren und erneut starten."
  exit 1
fi
terraform version | head -n 1
echo

###############################################################################
# 1) Terraform-Konfigurationsverzeichnis finden (Root oder ./infra)
###############################################################################
echo "== 1) Terraform-Konfigurationsverzeichnis identifizieren =="

TF_DIR=""

# Fall A: Benutzende stehen bereits im Infra-Verzeichnis (mindestens eine .tf-Datei)
if ls *.tf *.tf.json >/dev/null 2>&1; then
  TF_DIR="."
  echo "Terraform-Konfiguration im aktuellen Verzeichnis gefunden."
# Fall B: Standardfall: Unterordner ./infra
elif [ -d "infra" ]; then
  TF_DIR="infra"
  echo "Terraform-Konfiguration im Unterverzeichnis ./infra gefunden."
else
  echo "FEHLER: Keine Terraform-Konfiguration gefunden (.tf oder .tf.json) und kein ./infra-Verzeichnis."
  echo "Bitte in das Infrastruktur-Verzeichnis wechseln (z. B. 'cd infra') und Skript erneut ausführen."
  exit 1
fi

echo "Arbeitsverzeichnis für Terraform: ${TF_DIR}"
echo

###############################################################################
# 2) Wechsel ins Terraform-Verzeichnis & Initialisierung
###############################################################################
if [ "${TF_DIR}" != "." ]; then
  cd "${TF_DIR}"
fi

echo "== 2) Terraform-Initialisierung im Verzeichnis: $(pwd) =="

if ! ls *.tf *.tf.json >/dev/null 2>&1; then
  echo "FEHLER: Im Verzeichnis $(pwd) wurden keine Terraform-Dateien (.tf/.tf.json) gefunden."
  exit 1
fi

echo "-- 2.1) terraform init (sicher, keine Änderungen in GCP) --"
terraform init -input=false -upgrade
echo

###############################################################################
# 3) Erster read-only Plan + State-Übersicht
###############################################################################
echo "== 3) Erster Terraform-Plan (read-only) & Stateübersicht =="

echo "-- 3.1) terraform plan (Fehler stoppen das Skript NICHT) --"
set +e
if [ -f "terraform.tfvars" ]; then
  terraform plan -var-file=terraform.tfvars
  PLAN_EXIT=$?
else
  echo "Hinweis: Keine terraform.tfvars gefunden, führe 'terraform plan' ohne -var-file aus."
  terraform plan
  PLAN_EXIT=$?
fi
set -e

if [ ${PLAN_EXIT} -ne 0 ]; then
  echo "WARNUNG: terraform plan ist mit Exit-Code ${PLAN_EXIT} fehlgeschlagen."
  echo "Wir fahren trotzdem mit State-Checks und möglichen Imports fort."
fi
echo

echo "-- 3.2) Terraform-State: relevante Ressourcenübersicht --"
set +e
terraform state list | grep -E "google_project_service|google_sql_user" || true
set -e
echo

###############################################################################
# 4) SQL-User-State sicherstellen: google_sql_user.app
###############################################################################
echo "== 4) SQL-User-State validieren (google_sql_user.app) =="

# Prüfen, ob Ressource in der Konfiguration überhaupt definiert ist
if grep -R 'resource[[:space:]]*"google_sql_user"[[:space:]]*"app"' . >/dev/null 2>&1; then
  echo "Konfiguration für 'google_sql_user.app' gefunden."

  set +e
  terraform state show google_sql_user.app >/dev/null 2>&1
  STATE_SQL_USER_EXISTS=$?
  set -e

  if [ ${STATE_SQL_USER_EXISTS} -eq 0 ]; then
    echo "OK: 'google_sql_user.app' ist bereits im Terraform-State vorhanden."
  else
    echo "INFO: 'google_sql_user.app' fehlt im State – Import wird durchgeführt."
    echo "      -> terraform import google_sql_user.app projects/${PROJECT_ID}/instances/${SQL_INSTANCE}/users/${SQL_USER}"
    terraform import google_sql_user.app "projects/${PROJECT_ID}/instances/${SQL_INSTANCE}/users/${SQL_USER}"
    echo "Import 'google_sql_user.app' abgeschlossen."
  fi
else
  echo "Hinweis: Keine Ressource 'google_sql_user.app' in der Konfiguration gefunden – Import wird übersprungen."
fi
echo

###############################################################################
# 5) Projektservice-State: google_project_service.apis["run.googleapis.com"]
###############################################################################
echo "== 5) Projektservice-State validieren (google_project_service.apis[\"${RUN_API_SERVICE}\"]) =="

# Prüfen, ob Ressource google_project_service.apis in der Konfiguration existiert
if grep -R 'resource[[:space:]]*"google_project_service"[[:space:]]*"apis"' . >/dev/null 2>&1; then
  echo "Konfiguration für 'google_project_service.apis' gefunden."

  SERVICE_ADDRESS="google_project_service.apis[\"${RUN_API_SERVICE}\"]"

  set +e
  terraform state show "${SERVICE_ADDRESS}" >/dev/null 2>&1
  STATE_RUN_API_EXISTS=$?
  set -e

  if [ ${STATE_RUN_API_EXISTS} -eq 0 ]; then
    echo "OK: '${SERVICE_ADDRESS}' ist bereits im Terraform-State vorhanden."
  else
    echo "INFO: '${SERVICE_ADDRESS}' fehlt im State – Import wird durchgeführt."
    echo "      -> terraform import ${SERVICE_ADDRESS} projects/${PROJECT_ID}/services/${RUN_API_SERVICE}"
    terraform import "${SERVICE_ADDRESS}" "projects/${PROJECT_ID}/services/${RUN_API_SERVICE}"
    echo "Import '${SERVICE_ADDRESS}' abgeschlossen."
  fi
else
  echo "Hinweis: Keine Ressource 'google_project_service.apis' in der Konfiguration gefunden – Import wird übersprungen."
fi
echo

###############################################################################
# 6) Zweiter read-only Plan nach den Imports
###############################################################################
echo "== 6) Zweiter Terraform-Plan nach State-Fix (read-only) =="

set +e
if [ -f "terraform.tfvars" ]; then
  terraform plan -var-file=terraform.tfvars
  FINAL_PLAN_EXIT=$?
else
  terraform plan
  FINAL_PLAN_EXIT=$?
fi
set -e

if [ ${FINAL_PLAN_EXIT} -eq 0 ]; then
  echo "OK: terraform plan nach den Imports erfolgreich (Exit-Code 0)."
else
  echo "WARNUNG: terraform plan nach den Imports ist mit Exit-Code ${FINAL_PLAN_EXIT} fehlgeschlagen."
  echo "Bitte die obige Plan-Ausgabe analysieren."
fi
echo

###############################################################################
# 7) Zusammenfassung & Sicherheitshinweis
###############################################################################
echo "== 7) Zusammenfassung =="

echo " - Terraform-Verzeichnis:      $(pwd)"
echo " - Projekt:                    ${PROJECT_ID}"
echo " - SQL-Instanz:                ${SQL_INSTANCE}"
echo " - SQL-User (erwartet):        ${SQL_USER}"
echo " - Run-API-Service (erwartet): ${RUN_API_SERVICE}"
echo
echo " - terraform init wurde ausgeführt."
echo " - terraform plan wurde vor und nach den State-Imports ausgeführt (read-only)."
echo " - Es wurde KEIN 'terraform apply' ausgeführt."
echo
echo "Bitte die Plan-Ausgaben prüfen. Wenn das Delta erwartungskonform ist,"
echo "kann 'terraform apply' nach formaler Freigabe separat manuell durchgeführt werden."
echo
echo "Automatisierung abgeschlossen."
