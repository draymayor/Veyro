#!/usr/bin/env bash
#
# ONE-TIME, MANUAL IAM grant for the 8 secrets api-deploy.yml now injects
# (see .github/workflows/api-deploy.yml's header comment and PR #3). Not
# run by CI. Grants the existing veyro-api-runtime Cloud Run runtime SA
# secretmanager.secretAccessor on each secret, matching the pattern
# already used for the prior 4 secrets (SUPABASE_URL etc.) and mirrored
# from apps/sweeper/scripts/gcp/bootstrap-sweeper-iam.sh's grant step.
#
# Requires: gcloud authenticated as a project owner/IAM admin, with the
# active project set to veyro-platform-mayowa (or PROJECT_ID overridden
# below). Does NOT create the secrets - all 8 already exist with at
# least one enabled version, confirmed separately.
#
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-veyro-platform-mayowa}"
API_RUNTIME_SA="${API_RUNTIME_SA:-veyro-api-runtime@${PROJECT_ID}.iam.gserviceaccount.com}"

SECRETS=(
  TATUM_API_KEY
  TATUM_BTC_XPUB
  TATUM_LTC_XPUB
  TATUM_DOGE_XPUB
  TATUM_EVM_XPUB
  TATUM_TRON_XPUB
  FCA_API_KEY
  CURRENCYFREAKS_API_KEY
)

echo "==> Granting ${API_RUNTIME_SA} secretmanager.secretAccessor on ${#SECRETS[@]} secrets in ${PROJECT_ID}"
for secret in "${SECRETS[@]}"; do
  echo "    ${secret}"
  gcloud secrets add-iam-policy-binding "${secret}" \
    --project "${PROJECT_ID}" \
    --member "serviceAccount:${API_RUNTIME_SA}" \
    --role "roles/secretmanager.secretAccessor"
done

echo "==> Done. Verify with:"
echo "    gcloud secrets get-iam-policy <SECRET_NAME> --project ${PROJECT_ID}"
