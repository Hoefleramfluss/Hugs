#!/usr/bin/env bash
# recon-once-post-mv.sh
# Zweck: Rollback-Skript aus tf-state-mv-cmds.sh sicher erzeugen,
#       terraform plan nach state-mv erzeugen und auf verbleibende "will be destroyed"-Einträge prüfen,
#       Ergebnisse in .deploy-info-1763042763/* ablegen.
#
# WICHTIG: Dieses Skript führt keine destruktiven Operationen aus. Es erzeugt ein Rollback-Skript,
# prüft Planergebnisse und schreibt Reports. Führe es im Projekt-Root aus.

set -euo pipefail
ROOT="$(pwd)"
DEPLOY_INFO=".deploy-info-1763042763"
INFRA_DIR="infra"

# Pfade (relativ zum Repo-Root)
TF_STATE_MV_CMDS="$ROOT/$DEPLOY_INFO/tf-state-mv-cmds.sh"
ROLLBACK_SCRIPT="$ROOT/$DEPLOY_INFO/tf-state-mv-rollback-cmds.sh"
PLAN_BASENAME="tfplan-post-mv.out"
PLAN_OUT="$ROOT/$INFRA_DIR/$PLAN_BASENAME"
PLAN_TXT="$ROOT/$DEPLOY_INFO/tfplan-post-mv.txt"
PLAN_LOG="$ROOT/$DEPLOY_INFO/terraform-plan-post-mv.txt"
DESTROYS_TXT="$ROOT/$DEPLOY_INFO/tfplan-post-mv-destroys.txt"
REPORT_JSON="$ROOT/$DEPLOY_INFO/reconcile-report.json"

# Safety checks
for f in "$TF_STATE_MV_CMDS" "$ROOT/$DEPLOY_INFO/terraform-state-backup.json" "$ROOT/$DEPLOY_INFO/tfplan.txt" "$ROOT/$DEPLOY_INFO/state-google_sql_user.app.txt" "$ROOT/$DEPLOY_INFO/gcloud-sql-users.txt"; do
  if [ ! -f "$f" ]; then
    echo "FEHLER: Erwartete Datei fehlt: $f" >&2
    echo "Abbruch. Stelle sicher, dass alle Inspect-Artefakte vorhanden sind." >&2
    exit 2
  fi
done

# 1) Erzeuge Rollback-Skript (robust via Python)
echo "Erzeuge Rollback-Skript: $ROLLBACK_SCRIPT"
python3 - "$TF_STATE_MV_CMDS" "$ROLLBACK_SCRIPT" <<'PY' 2> "$ROOT/$DEPLOY_INFO/rollback-gen-stderr.log"
import sys, re, pathlib

src = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])
lines = src.read_text().strip().splitlines()
out_lines = []
for ln in lines:
    s = ln.strip()
    # try pattern: terraform state mv 'old' 'new' or "old" "new"
    m = re.match(r"""terraform\s+state\s+mv\s+['\"]([^'\"]+)['\"]\s+['\"]([^'\"]+)['\"]""", s)
    if m:
        old, new = m.groups()
        out_lines.append(f"terraform state mv '{new}' '{old}'")
        continue
    # try pattern without quotes
    m = re.match(r"""terraform\s+state\s+mv\s+(\S+)\s+(\S+)""", s)
    if m:
        old, new = m.groups()
        # strip surrounding quotes if any
        old = old.strip("'\"")
        new = new.strip("'\"")
        out_lines.append(f"terraform state mv '{new}' '{old}'")
        continue
    # otherwise ignore line (but preserve as comment for review)
    if s:
        out_lines.append(f"# UNPARSED: {s}")
dst.write_text("\n".join(out_lines) + "\n")
print(f"Wrote {len(out_lines)} lines to {dst}", file=sys.stdout)
PY

chmod +x "$ROLLBACK_SCRIPT"
echo "Rollback-Skript erzeugt und ausführbar gemacht: $ROLLBACK_SCRIPT"

# 2) Re-run terraform plan (post-mv)
echo "Wechsle in $INFRA_DIR und initialisiere Terraform (falls nötig), plan erzeugen..."
cd "$INFRA_DIR"
terraform init -reconfigure 2>&1 | tee "$ROOT/$DEPLOY_INFO/terraform-init-post-mv.txt"

# Führe plan aus und schreibe Ausgaben ins Deploy-Info-Verzeichnis
echo "Erzeuge neuen Plan: $PLAN_OUT  (Logs -> $PLAN_LOG, Text -> $PLAN_TXT)"
terraform plan -var-file=terraform.tfvars -out="$PLAN_BASENAME" 2>&1 | tee "$ROOT/$DEPLOY_INFO/terraform-plan-post-mv.txt"
terraform show -no-color "$PLAN_BASENAME" | tee "$PLAN_TXT"

# 3) Suche nach verbleibenden "will be destroyed"-Einträgen
grep -n "will be destroyed" "$PLAN_TXT" > "$DESTROYS_TXT" || true

if [ -s "$DESTROYS_TXT" ]; then
  echo "WARN: Der Plan enthält weiterhin zerstörerische Änderungen. Siehe $DESTROYS_TXT"
  # Erzeuge einen kurzen Report mit Details
  TF_STATE_MV_CMDS_PATH="$TF_STATE_MV_CMDS" DESTROYS_TXT_PATH="$DESTROYS_TXT" python3 - <<'PY' > "$REPORT_JSON"
import json, datetime, pathlib, os

tf_state_mv_cmds = pathlib.Path(os.environ["TF_STATE_MV_CMDS_PATH"])
destroys_path = pathlib.Path(os.environ["DESTROYS_TXT_PATH"])

with tf_state_mv_cmds.open() as f:
    mv_count = sum(1 for _ in f)
with destroys_path.open() as f:
    destroys_snippet = f.read().strip()

d = {
  "mode": "state-mv",
  "state_mv_count": mv_count,
  "imports_count": 0,
  "plan_post_reconcile_has_destroys": True,
  "destroys_snippet": destroys_snippet,
  "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
}
print(json.dumps(d, indent=2))
PY
  echo "Report geschrieben nach: $REPORT_JSON"
  echo "=== Wichtig: NICHT anwenden. Bitte Review durch Infra-Team und ggf. Rollback mit $ROLLBACK_SCRIPT"
  exit 4
else
  echo "Erfolg: Kein 'will be destroyed' Eintrag mehr im Plan."
  # 4) Erzeuge reconcile-report.json mit Erfolg
  TF_STATE_MV_CMDS_PATH="$TF_STATE_MV_CMDS" python3 - <<'PY' > "$REPORT_JSON"
import json, datetime, pathlib, os

tf_state_mv_cmds = pathlib.Path(os.environ["TF_STATE_MV_CMDS_PATH"])

with tf_state_mv_cmds.open() as f:
    mv_count = sum(1 for _ in f)

d = {
  "mode": "state-mv",
  "state_mv_count": mv_count,
  "imports_count": 0,
  "plan_post_reconcile_has_destroys": False,
  "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
}
print(json.dumps(d, indent=2))
PY
  echo "Report geschrieben nach: $REPORT_JSON"
  # 5) Schreibe menschliche Zusammenfassung
  cat > "$ROOT/$DEPLOY_INFO/reconcile-summary.txt" <<EOF
Reconcile-Report (state-mv)
---------------------------
Mode: state-mv
State-mv commands executed: $(wc -l < "$TF_STATE_MV_CMDS")
Plan nach Reconcile: $(wc -l < "$PLAN_TXT") lines (siehe $PLAN_TXT)
No destructive 'will be destroyed' entries found.
Rollback script: $ROLLBACK_SCRIPT (für Undo)
Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
  echo "Zusammenfassung geschrieben nach: $ROOT/$DEPLOY_INFO/reconcile-summary.txt"
  echo "Nächste Schritte:"
  echo " - Prüfe $PLAN_TXT manuell."
  echo " - Hole den Approval-String (siehe README/Policy) bevor du terraform apply ausführst."
  echo
  echo "Approval-String (Beispiel):"
  echo
  echo "APPROVAL: infra-team@company approved terraform apply for plan infra/tfplan-post-mv.out at $(date -u +%Y-%m-%dT%H:%M:%SZ) (ticket <ticket-or-PR>)"
  exit 0
fi
