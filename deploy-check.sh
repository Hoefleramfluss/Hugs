#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
ROOT="$SCRIPT_DIR"
INFODIR="$ROOT/.deploy-info-$(date +%s)"
mkdir -p "$INFODIR"

echo "=== 0) Kontext"
echo "Projekt-Pfad: $ROOT"
echo "Speichere Logs/Outputs in: $INFODIR"
echo
echo "=== 1) Repo & Manifest prüfen"
echo "-- manifest (ausgabe)"
if [ -f manifest-frontend-fix.json ]; then
  cat manifest-frontend-fix.json | tee "$INFODIR/manifest.json"
else
  echo "WARN: manifest-frontend-fix.json nicht gefunden." | tee "$INFODIR/manifest.warn"
fi
echo
echo "-- git status prüfen"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --porcelain=2 --branch | tee "$INFODIR/git-status.txt"
else
  echo "WARN: aktueller Ordner ist kein git-Repository (kein .git)."
  echo "Falls du ein Repo erwartest: clone das Repo erneut oder initialisiere git und füge remote hinzu."
  echo "Beispiel zum Wiederherstellen (falls nötig):"
  echo "  git clone <url> <dir>  # oder"
  echo "  git init && git remote add origin <url>"
fi
echo

echo "=== 2) Terraform Safe-Check (nur Plan, kein Apply)"
pushd infra >/dev/null
[ -f terraform.tfvars ] || cp terraform.tfvars.example terraform.tfvars
echo "terraform init -reconfigure"
terraform init -reconfigure | tee "$INFODIR/terraform-init.txt"

echo ">>> import_commands.sh (nur anzeigen, nicht automatisch ausführen)"
if [ -f import_commands.sh ]; then
  sed -n '1,200p' import_commands.sh | sed -n '1,200p' > "$INFODIR/import_commands.sh.preview"
  echo "import_commands.sh Vorschau geschrieben nach $INFODIR/import_commands.sh.preview"
else
  echo "Kein import_commands.sh gefunden."
fi

echo "terraform plan -var-file=terraform.tfvars -out=tfplan.out"
terraform plan -var-file=terraform.tfvars -out=tfplan.out | tee "$INFODIR/terraform-plan.txt"
echo "terraform show -no-color tfplan.out -> $INFODIR/tfplan.txt"
terraform show -no-color tfplan.out | tee "$INFODIR/tfplan.txt"
popd >/dev/null
echo

echo "=== 3) Backend-Health (Prod) prüfen"
BACKEND_URL="https://hugs-backend-prod-787273457651.europe-west3.run.app"
curl -svf "${BACKEND_URL}/api/healthz" > "$INFODIR/backend-health.raw" 2>&1 || {
  echo "Backend health check schlug fehl oder lieferte nicht HTTP 200. Siehe $INFODIR/backend-health.raw"
  echo "Empfohlene Untersuchungsschritte:"
  echo "  - Prüfe Cloud Run logs: gcloud run services logs read hugs-backend-prod --region=europe-west3 --project=hugs-headshop-20251108122937"
  echo "  - Prüfe, ob der Pfad /api/healthz rentiert ist (Controller/Route in Backend)."
  echo
}
echo "Ausgabe gespeichert: $INFODIR/backend-health.raw"
echo

echo "=== 4) Frontend-Build lokal"
echo "Versuche scripted check:"
API_URL=http://localhost:4000 bash ./ci/check_frontend_build.sh 2>&1 | tee "$INFODIR/check_frontend_build.txt" || {
  echo "check_frontend_build.sh ist fehlgeschlagen — Fall-back: production build versuchen"
  NEXT_PUBLIC_API_URL="${BACKEND_URL}" npm run build --workspace=frontend 2>&1 | tee "$INFODIR/frontend-build.txt"
}
echo

echo "=== 5) Docker-Smoke (lokal) - prüfe Docker CLI"
if command -v docker >/dev/null 2>&1; then
  echo "Docker vorhanden, baue und teste Container (kurzer smoke)."
  docker build -f frontend/Dockerfile -t hugs-frontend-local --build-arg NEXT_PUBLIC_API_URL="${BACKEND_URL}" frontend | tee "$INFODIR/docker-build.txt"
  docker run -d --name hugs-frontend-local -p 3000:3000 -e NEXT_PUBLIC_API_URL="${BACKEND_URL}" hugs-frontend-local
  sleep 2
  curl -sf http://localhost:3000/healthz >/dev/null 2>&1 && echo "Container /healthz OK" || echo "Container /healthz nicht erreichbar"
  curl -sf http://localhost:3000/ >/dev/null 2>&1 && echo "Frontend root erreichbar" || echo "Frontend root nicht erreichbar"
  docker rm -f hugs-frontend-local || true
else
  echo "Docker CLI nicht gefunden — überspringe lokalen Docker-Test. Installiere Docker oder führe diesen Schritt in einer Maschine mit Docker aus."
fi
echo

echo "=== 6) Cloud Build Deploy (Frontend) - Preflight"
echo "Hinweis: wir führen hier nur einen Validierungs-Check aus, kein deploy."
echo "Prüfe ci/cloudbuild.yaml auf ungültige Substitution-Keys (z. B. BACKEND_URL statt _BACKEND_URL):"
grep -n "BACKEND_URL" ci/cloudbuild.yaml || echo "Keinen direkten BACKEND_URL-Eintrag gefunden (oder grep nichts gefunden)."
echo "Prüfe _DEPLOY_TARGET Verwendung:"
grep -n "_DEPLOY_TARGET" ci/cloudbuild.yaml || echo "_DEPLOY_TARGET wird vermutlich nicht in YAML referenziert."

echo
echo "Wenn du deployen willst, benutze (nach Fixes unten):"
echo "gcloud builds submit --config=ci/cloudbuild.yaml --project=hugs-headshop-20251108122937 \\
  --substitutions=_GCP_REGION=europe-west3,_ARTIFACT_REPO=hugs-headshop-repo,_ENV=prod,_NEXT_PUBLIC_API_URL=${BACKEND_URL},COMMIT_SHA=manual-\$(date +%s)"
echo "Achte darauf: nur Substitutions mit führendem _ sind erlaubt; alle benutzten Keys müssen in ci/cloudbuild.yaml als \${_KEY} referenziert werden."
echo

echo "=== 7) Post-Deploy Smoke (nur wenn Cloud Build erfolgreich ist) ==="
echo "Wenn deployment durchgelaufen ist, die automatischen Checks wären:"
echo "  FRONTEND_URL=\$(gcloud run services describe hugs-frontend-prod --region=europe-west3 --project=hugs-headshop-20251108122937 --format='value(status.url)')"
echo "  curl -sf \"\$FRONTEND_URL/healthz\""
echo "  curl -sf ${BACKEND_URL}/api/healthz"
echo "  PW_BASE_URL=\"\$FRONTEND_URL\" npx playwright test frontend/e2e/admin-login.spec.ts --project=chromium --reporter=list"
echo

echo "=== 8) Prisma Migrations (NICHT automatisch ausführen) ==="
echo "VORSICHT: Nur nach Backup und expliziter Freigabe!"
echo "Wenn du bereit bist, führe manuell:"
echo "  gcloud sql backups create --instance=hugs-pg-instance-prod --project=hugs-headshop-20251108122937"
echo "  # WARTE bis Backup fertig ist, prüfe Status"
echo "  npx prisma migrate deploy"
echo "Nur mit CONFIRM_PROD_SEED=true: npm run db:seed"
echo

echo "=== Fertig. Outputs / Logs sind in: $INFODIR ==="
echo
echo "KURZANLEITUNG: Wichtigste Fix-Schritte (Quick Wins):"
echo "  - Backend /api/healthz prüfen: Cloud Run logs lesen + prüfen, ob Route existiert."
echo "  - Cloud Build: entferne/ersetze alle nicht-underscore Substitutions (z. B. BACKEND_URL -> _BACKEND_URL) *und* referenziere sie in ci/cloudbuild.yaml; oder rufe gcloud builds submit ohne ungültige keys auf."
echo "  - Docker: installiere Docker oder führe Docker-Schritt in CI/Cloud Build aus."
echo "  - Terraform: prüfe tfplan.txt in $INFODIR/infra/tfplan.txt genau auf Zerstörung sensibler Ressourcen (z.B. sql users). Apply nur nach Review: terraform apply tfplan.out"
echo
echo "Wenn du willst, kann ich dir jetzt:"
echo "  A) eine sed/patched-Version der ci/cloudbuild.yaml erzeugen, die BACKEND_URL -> _BACKEND_URL umbenennt (als Vorschlag),"
echo "  B) ein kurzes PR-Diff (patch) vorbereiten, das die Cloud Build substitutions korrekt setzt, oder"
echo "  C) die konkreten Log-Kommandos für Cloud Run / Cloud Build zur Fehleranalyse liefern."
echo "Antworte mit A / B / C oder 'weiter' um fortzufahren."

echo
echo "Statusbericht (Kurz & präzise, basierend auf deinen Ausgaben)"
echo "Was ich geprüft habe / was die Befehle ergeben haben"
echo "manifest-frontend-fix.json wurde gelesen und zeigt viele Frontend-Fixes (Safety/timeout, next/image, Dockerfile, Playwright smoke test, cloudbuild changes). (Manifest gespeichert.)"
echo "git status ergab: kein Git-Repository (fatal: not a git repository). Du arbeitest im Projektordner ohne .git. → kein Commit/remote-Zugriff möglich."
echo "ls -a listet normale Projektdateien (infra, frontend, ci, etc.) — Projektinhalt vorhanden."
echo "Terraform: terraform init -reconfigure erfolgreich. terraform plan -var-file=terraform.tfvars -out=tfplan.out lief und erzeugte einen Plan (Plan: 9 to add, 1 to change, 10 to destroy). terraform show -no-color tfplan.out wurde in tfplan.txt geschrieben. → WICHTIG: Plan enthält Zerstörungen (u. a. Entfernen von google_sql_user.app) — nicht automatisch anwenden."
echo "import_commands.sh forderte Authentifizierung / interaktive Eingabe; wurde nicht automatisch durchlaufen."
echo "Backend health check (curl https://.../api/healthz) lieferte HTTP 404 (nicht 200) — Endpoint nicht verfügbar / falscher Pfad / Route fehlt. TLS ok."
echo "Frontend build: ci/check_frontend_build.sh + npm run build --workspace=frontend lief erfolgreich (Build-Output und Route-Listing). Build scheint lokal möglich."
echo "Docker: docker CLI nicht vorhanden (zsh: command not found: docker) — lokaler Docker-Smoke konnte nicht ausgeführt."
echo "Cloud Build submit: Fehlgeschlagen wegen ungültiger Substitution: invalid value for 'build.substitutions': key in the template \"BACKEND_URL\" ist kein gültiger benutzerdefinierter Key. Danach zweite Fehlversuche zeigten weiterhin Probleme:"
echo "BACKEND_URL ist kein erlaubter (nicht-underscore) Substitutions-Key → Cloud Build verlangt führendes _ für benutzerdefinierte Substitutions."
echo "Später: _DEPLOY_TARGET wurde auf CLI gesetzt, ist aber im YAML nicht verwendet → entweder entfernen oder in das YAML einbauen."
echo "Insgesamt: Cloud Build startet nicht, deswegen kein Deploy."
echo
echo "Blocker / Risiken"
echo "Backend 404: verhindert erfolgreiche End-to-end Smoke-Tests. Ursache: Route fehlt, falscher Pfad, oder service ist fehlerhaft. Prüfe Cloud Run logs."
echo "Terraform-Plan enthält destruktive Änderungen (10 destroy). Unbedingt Review vor terraform apply. Risiko: Datenverluste (DB-User, services)."
echo "Cloud Build: ci/cloudbuild.yaml nutzt/erwartet Substitutions die nicht korrekt übergeben werden (BACKEND_URL vs _BACKEND_URL, unused _DEPLOY_TARGET). Fix nötig."
echo "Docker fehlend: lokal kann kein Container-Smoketest durchgeführt werden; optional auf CI/Cloud Build auslagern."
echo "Kein Git: keine Versionierung/PR-Möglichkeit im aktuellen Verzeichnis — Änderungen lokal riskant."
echo
echo "Empfohlene nächste Schritte (Priorisiert)"
echo "Backend:"
echo "gcloud run services logs read hugs-backend-prod --region=europe-west3 --project=hugs-headshop-20251108122937 --limit 200"
echo "Prüfe, ob die Route /api/healthz in Backend-Code existiert oder ob der Pfad /healthz ist."
echo "Wenn Code-Fehler, deploy Hotfix (erst nach Tests)."
echo
echo "Terraform:"
echo "Öffne infra/tfplan.txt (oder $INFODIR/infra/tfplan.txt) und review die Einträge, die - (destroy) zeigen."
echo "Spreche mit Team/Owner bevor du terraform apply tfplan.out ausführst."
echo
echo "Cloud Build Fix:"
echo "Ersetze in ci/cloudbuild.yaml alle nicht-underscore Substitution-Keys (z. B. BACKEND_URL) durch _BACKEND_URL und referenziere sie als \${_BACKEND_URL}, oder entferne sie, wenn unnötig."
echo "Entferne das überflüssige CLI-Substitution-Argument _DEPLOY_TARGET oder verknüpfe es im YAML."
echo "Nach Fix: gcloud builds submit --config=ci/cloudbuild.yaml --project=... --substitutions=_GCP_REGION=europe-west3,_ARTIFACT_REPO=hugs-headshop-repo,_ENV=prod,_NEXT_PUBLIC_API_URL=\${_BACKEND_URL},COMMIT_SHA=manual-\$(date +%s)"
echo
echo "Docker: installiere Docker lokal oder führe Docker-Schritt in CI (Cloud Build) aus."
echo "Git: Falls du mit Versionskontrolle arbeiten möchtest, clone das Repo sauber oder initialisiere Git + setze remote bevor du Änderungen machst."
echo
echo "Optionale/erweiterte Aktionen"
echo "Bereite ein Patch (sed) vor, das BACKEND_URL -> _BACKEND_URL umbenennt (ich kann dir das Patch-Command liefern)."
echo "Wenn du den Deploy-Flow automatisieren willst, füge _DEPLOY_TARGET in ci/cloudbuild.yaml substitutions:-Block und verwende \${_DEPLOY_TARGET} in steps, um Frontend-only Deploys zu steuern."
echo "Prisma-Migrationen nur nach Backup: gcloud sql backups create ... und Bestätigung CONFIRM_PRISMA_DEPLOY=true."
