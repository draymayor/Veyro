#!/usr/bin/env bash
#
# ONE-TIME, MANUAL bootstrap for the sweeper's IAM/infra. Not run by CI.
# Read every command before running this - it creates real GCP resources
# and grants real IAM bindings. Requires: gcloud authenticated as a
# project owner/IAM admin, and these env vars set:
#
#   PROJECT_ID          - GCP project id
#   REGION               - e.g. us-central1
#   ARTIFACT_REPO        - existing Artifact Registry repo (shared with apps/api)
#   API_RUNTIME_SA       - apps/api's existing runtime service account email
#                          (the one GCP_RUNTIME_SERVICE_ACCOUNT points to in
#                          .github/workflows/api-deploy.yml) - used only to
#                          explicitly DENY it below.
#
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:?Set REGION}"
: "${ARTIFACT_REPO:?Set ARTIFACT_REPO}"
: "${API_RUNTIME_SA:?Set API_RUNTIME_SA}"

SWEEPER_SA_NAME="veyro-sweeper"
SWEEPER_SA_EMAIL="${SWEEPER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
JOB_NAME="veyro-sweeper"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${JOB_NAME}:bootstrap"

SECRETS=(
  SWEEPER_BTC_SEED
  SWEEPER_LTC_SEED
  SWEEPER_DOGE_SEED
  SWEEPER_EVM_SEED
  SWEEPER_TRON_SEED
)

echo "==> 1. Creating the sweeper's dedicated service account"
gcloud iam service-accounts create "${SWEEPER_SA_NAME}" \
  --project "${PROJECT_ID}" \
  --display-name "Veyro Sweeper (Cloud Run Job)" \
  || echo "    (already exists, skipping)"

echo "==> 2. Creating the 5 master seed secrets (empty placeholders only)"
for secret in "${SECRETS[@]}"; do
  gcloud secrets create "${secret}" \
    --project "${PROJECT_ID}" \
    --replication-policy="automatic" \
    || echo "    ${secret} already exists, skipping creation"
done
echo "    NOTE: secrets created empty. Populating real seed material is a"
echo "    separate, deliberate step - not part of this script."

echo "==> 3. Granting the sweeper's SA secretAccessor on all 5, and"
echo "        explicitly denying the API's runtime SA on all 5"
for secret in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "${secret}" \
    --project "${PROJECT_ID}" \
    --member "serviceAccount:${SWEEPER_SA_EMAIL}" \
    --role "roles/secretmanager.secretAccessor"

  # Belt-and-suspenders: IAM is deny-by-default (the API SA was never
  # granted access in the first place, since these secrets didn't exist
  # when api-deploy.yml's 4 secrets were bound), but an explicit deny
  # policy makes the intent auditable and survives someone later adding a
  # broad "secretAccessor on all secrets in this project" grant by mistake.
  cat > /tmp/deny-api-sa-policy.yaml <<EOF
- action: DENY
  rule:
    conditionExpression: "true"
    permissions:
      - secretmanager.versions.access
    principals:
      - "serviceAccount:${API_RUNTIME_SA}"
EOF
  gcloud secrets set-iam-policy "${secret}" /tmp/deny-api-sa-policy.yaml \
    --project "${PROJECT_ID}" 2>/dev/null \
    || echo "    (deny-policy step needs an org policy / IAM Conditions setup - see README, apply manually if this fails)"
done

echo "==> 4. Creating the Cloud Run Job (image built by CI on first push;"
echo "        this bootstrap deploy is a placeholder so the scheduler has"
echo "        something to point at)"
gcloud run jobs create "${JOB_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --service-account "${SWEEPER_SA_EMAIL}" \
  --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID}" \
  --max-retries 1 \
  --task-timeout 900 \
  || echo "    (job already exists, skipping - CI's deploy step updates it going forward)"

echo "==> 5. Creating the two staggered Cloud Scheduler jobs"
gcloud scheduler jobs create http "${JOB_NAME}-utxo" \
  --project "${PROJECT_ID}" \
  --location "${REGION}" \
  --schedule "0 */12 * * *" \
  --uri "https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method POST \
  --oauth-service-account-email "${SWEEPER_SA_EMAIL}" \
  --message-body '{"overrides":{"containerOverrides":[{"env":[{"name":"SWEEP_GROUP","value":"utxo"}]}]}}' \
  || echo "    (already exists, skipping)"

gcloud scheduler jobs create http "${JOB_NAME}-evm" \
  --project "${PROJECT_ID}" \
  --location "${REGION}" \
  --schedule "0 */6 * * *" \
  --uri "https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method POST \
  --oauth-service-account-email "${SWEEPER_SA_EMAIL}" \
  --message-body '{"overrides":{"containerOverrides":[{"env":[{"name":"SWEEP_GROUP","value":"evm"}]}]}}' \
  || echo "    (already exists, skipping)"

echo "==> Done. Next steps: populate the 5 secrets with real seed material"
echo "    (see apps/sweeper/README.md), insert consolidation_wallets rows"
echo "    for each chain, then run a dry-run job execution before enabling"
echo "    the schedulers for real."
