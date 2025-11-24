# Release Checklist

## E2E Smoke – Playwright (PROD)

Vor jedem PROD-Go-Live:

1. Frontend-URL ermitteln (automatisiert):
   - `tools/run-playwright-prod.sh` liest die Cloud-Run-URL (`hugs-frontend-prod`) automatisch aus.
2. Playwright-Smoketest gegen PROD ausführen:
   ```bash
   ./tools/run-playwright-prod.sh
   ```

Prüfen:
- Alle Specs in `frontend/e2e/*.spec.ts` sind grün (Chromium-Projekt).
- HTML-Report liegt unter `.deploy-info-<TIMESTAMP>/playwright-report`.
- Logfile `.deploy-info-<TIMESTAMP>/playwright-prod.log` dem Release-Protokoll anhängen.
- Health-Checks dokumentieren:
  - Backend: `GET ${BACKEND_URL}/api/healthz` → 200
  - Frontend: `GET ${FRONTEND_URL}/health` → 200 (kanonischer Health-Endpunkt)

Falls ein Test scheitert:
- Ursache analysieren (Regression vs. Testfehler).
- Fix deployen oder Deployment stoppen.
- Bei Testfehlern Smoke-Tests anpassen, ohne die Abdeckung zu reduzieren (Homepage, Admin-Login, Produktdetails, Admin SEO/PDW).

### 2025-11-17
- [x] PROD Smoke (Playwright, Chromium) via `tools/run-playwright-prod.sh`
  - homepage.spec.ts ✅
  - admin-login.spec.ts ✅
  - admin-pdw.spec.ts ✅
  - admin-seo.spec.ts ✅
  - product-reviews.spec.ts ✅
  - Health-Checks: Backend `/api/healthz` 200, Frontend `/health` 200
  - Deploy-Artefakte: `.deploy-info-1763380384/`
