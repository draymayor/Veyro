#!/usr/bin/env bash
#
# ONE-TIME, MANUAL bootstrap for the consolidator's IAM/infra. Not run by
# CI. Read every command before running this - it creates real GCP
# resources and grants real IAM bindings around a secret that controls
# funds across all 5 consolidation wallets simultaneously. Requires:
# gcloud authenticated as a project owner/IAM admin, and these env vars
# set:
#
#   PROJECT_ID          - GCP project id
#   REGION               - e.g. us-central1
#   ARTIFACT_REPO        - existing Artifact Registry repo (shared with
#                          apps/api and the sweeper)
#   API_RUNTIME_SA       - apps/api's existing runtime service account
#                          email (the one GCP_RUNTIME_SERVICE_ACCOUNT
#                          points to in .github/workflows/api-deploy.yml)
#                          - used only to explicitly DENY it below.
#
# Deliberately separate from bootstrap-sweeper-iam.sh: this secret
# controls all 5 consolidation wallets via one shared phrase (Option A,
# confirmed 2026-09-01 by deriving all 5 addresses from the real phrase
# and matching them exactly against consolidation_wallets - see
# scripts/verify-consolidator-derivation.js), a materially larger blast
# radius per credential than any one of the sweeper's 5 independent
# per-chain seeds. It gets its own dedicated service account rather than
# extending the sweeper's, so the two credentials can be scoped, audited,
# and rotated/revoked independently of each other.
#
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:?Set REGION}"
: "${ARTIFACT_REPO:?Set ARTIFACT_REPO}"
: "${API_RUNTIME_SA:?Set API_RUNTIME_SA}"

CONSOLIDATOR_SA_NAME="veyro-consolidator"
CONSOLIDATOR_SA_EMAIL="${CONSOLIDATOR_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
JOB_NAME="veyro-consolidator"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${JOB_NAME}:bootstrap"

SECRET_NAME="CONSOLIDATION_MASTER_SEED"

# ---------------------------------------------------------------------------
# CONFIRMED derivation paths (2026-09-01) - all 5 verified with real, exact
# address matches against consolidation_wallets via
# scripts/verify-consolidator-derivation.js ("OVERALL: ALL MATCH (5/5
# chains checked)"). These are the ONLY paths the eventual signer job
# should use - hardcode them verbatim from this block, do not re-derive,
# guess, or "try adjacent indices". Each is a single fixed index (0), not
# a range - the consolidation wallets are 5 specific, known addresses, not
# a derived range like the sweeper's per-user deposit addresses.
#
#   BTC  (native segwit, bech32): m/84'/0'/0'/0/0
#   LTC  (native segwit, bech32): m/84'/2'/0'/0/0
#   DOGE (legacy P2PKH, no segwit support): m/44'/3'/0'/0/0
#   EVM  (all EVM networks share one address space): m/44'/60'/0'/0/0
#   TRON: m/44'/195'/0'/0/0
#
# Note these paths differ from the sweeper's own (m/44'/0'/0'/0/{i} for
# all 3 UTXO chains, matching Tatum's xpub convention) - the consolidation
# wallets were created independently (Trust Wallet's standard BIP-84/
# SLIP-44 defaults), not through Tatum, so the two path sets are
# unrelated and neither should be "fixed" to match the other.
# ---------------------------------------------------------------------------

echo "==> 1. Creating the consolidator's dedicated service account"
echo "        (deliberately NOT the sweeper's SA - see header comment)"
gcloud iam service-accounts create "${CONSOLIDATOR_SA_NAME}" \
  --project "${PROJECT_ID}" \
  --display-name "Veyro Consolidator (Cloud Run Job)" \
  || echo "    (already exists, skipping)"

echo "==> 2. Creating the master seed secret (empty placeholder only -"
echo "        it should already be populated; this is a no-op if so)"
gcloud secrets create "${SECRET_NAME}" \
  --project "${PROJECT_ID}" \
  --replication-policy="automatic" \
  || echo "    ${SECRET_NAME} already exists, skipping creation"

echo "==> 3. Granting the consolidator's SA secretAccessor, and explicitly"
echo "        denying the API's runtime SA - same explicit-deny pattern"
echo "        as the sweeper's 5 seeds, non-negotiable given this one"
echo "        secret's blast radius covers all 5 consolidation wallets"
gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
  --project "${PROJECT_ID}" \
  --member "serviceAccount:${CONSOLIDATOR_SA_EMAIL}" \
  --role "roles/secretmanager.secretAccessor"

# CORRECTED 2026-09-01: `gcloud secrets set-iam-policy` takes a regular
# IAM *allow* Policy object ({"bindings": [...]}) - it cannot express a
# deny rule at all, and the YAML fragment this used to post here fails
# with "'list' object has no attribute 'items'" because it isn't a valid
# Policy. IAM Deny policies are a separate GCP primitive (separate API,
# separate `gcloud iam policies ... --kind=denypolicies` subtree) and,
# per https://docs.cloud.google.com/iam/docs/deny-overview /
# https://docs.cloud.google.com/iam/docs/deny-access, attach only at
# org/folder/project level - never to one individual secret - and their
# denialCondition is restricted to resource-tag matching
# (resource.matchTag(...)) only; other functions/attributes (including
# resource.name) are not supported. So scoping the deny to just this one
# secret (not the API SA's other, needed secrets like SUPABASE_URL)
# requires tagging the secret first, then conditioning the deny on that
# tag - not a single set-iam-policy call.

TAG_KEY_SHORT="consolidation-deny-scope"
TAG_VALUE_SHORT="consolidator-secret"

echo "    3a. Creating the tag key/value (idempotent - ignore 'already exists')"
gcloud resource-manager tags keys create "${TAG_KEY_SHORT}" \
  --parent "projects/${PROJECT_ID}" \
  --description "Marks secrets the API runtime SA must never access" \
  || echo "    (tag key already exists, skipping - look it up with: gcloud resource-manager tags keys list --parent projects/${PROJECT_ID})"

TAG_KEY_ID="$(gcloud resource-manager tags keys describe "${PROJECT_ID}/${TAG_KEY_SHORT}" --format='value(name)' | sed 's#tagKeys/##')"

gcloud resource-manager tags values create "${TAG_VALUE_SHORT}" \
  --parent "tagKeys/${TAG_KEY_ID}" \
  --description "${SECRET_NAME} and similar" \
  || echo "    (tag value already exists, skipping)"

echo "    3b. Binding the tag to ${SECRET_NAME} specifically (requires"
echo "        Secret Manager Admin on this project)"
gcloud resource-manager tags bindings create \
  --tag-value "${PROJECT_ID}/${TAG_KEY_SHORT}/${TAG_VALUE_SHORT}" \
  --parent "//secretmanager.googleapis.com/projects/${PROJECT_ID}/secrets/${SECRET_NAME}" \
  || echo "    (binding already exists, skipping)"

# STATUS (2026-09-01): this step (3c) was attempted and, after
# exhausting every reasonable path - project-level role grant, org-level
# role grant, the Cloud Console UI, and Google's own Policy
# Troubleshooter/Remediator - could NOT be completed. roles/iam.denyAdmin
# cannot be granted at the project level at all ("not supported for this
# resource"); granted at the org level instead, it still does not
# resolve iam.denypolicies.create for this account on this project (or
# even on the org itself). Google's own Remediator confirmed "no
# individual, predefined roles include all missing permissions" for this
# account/resource combination - a genuine, undocumented structural gap,
# not a mistake in the command below. See apps/sweeper/README.md's
# "CONSOLIDATION_MASTER_SEED - IAM Deny policy status" section for the
# full account of what was tried and why the secret is still safe
# without this step: veyro-api-runtime has never been granted
# secretAccessor on this secret (verified via
# `gcloud secrets get-iam-policy`), and GCP IAM is deny-by-default, so
# access is already correctly blocked. Steps 3a/3b (the tag) already
# succeeded and are real, applied state - only this final command is
# still outstanding. Leave this step in place rather than deleting it:
# if the permission gap is ever resolved, this is the one command left
# to run.
echo "    3c. Writing and applying the actual IAM Deny policy (KNOWN TO"
echo "        CURRENTLY FAIL for this account/project - see README before"
echo "        spending time debugging this further)"
cat > /tmp/deny-consolidator-secret-policy.json <<EOF
{
  "displayName": "Deny API runtime SA on consolidator secrets",
  "rules": [
    {
      "denyRule": {
        "deniedPrincipals": ["principal://iam.googleapis.com/projects/-/serviceAccounts/${API_RUNTIME_SA}"],
        "deniedPermissions": ["secretmanager.googleapis.com/versions.access"],
        "denialCondition": {
          "expression": "resource.matchTag('${TAG_KEY_ID}/${TAG_KEY_SHORT}', '${TAG_VALUE_SHORT}')",
          "title": "Only secrets tagged ${TAG_KEY_SHORT}=${TAG_VALUE_SHORT}"
        }
      }
    }
  ]
}
EOF
gcloud iam policies create "consolidator-secret-deny" \
  --attachment-point "cloudresourcemanager.googleapis.com/projects/${PROJECT_ID}" \
  --kind "denypolicies" \
  --policy-file /tmp/deny-consolidator-secret-policy.json \
  || echo "    (as of 2026-09-01 this fails with PERMISSION_DENIED for this account regardless of role/grant level - see the STATUS comment above and README.md before treating this as a simple retry-able error)"

# Belt-and-suspenders: also explicitly confirm the sweeper's own SA has no
# access to this secret. Nothing in this script grants it any - IAM is
# deny-by-default - but this secret's blast radius (all 5 consolidation
# wallets at once) is exactly why access must stay scoped to the
# consolidator's own SA alone, never inherited or reused from any other
# service's identity, sweeper included.
echo "==> 4. (No binding needed) confirming the sweeper's SA is not granted"
echo "        access to ${SECRET_NAME} - it never is unless someone adds a"
echo "        binding by hand. Check periodically with:"
echo "          gcloud secrets get-iam-policy ${SECRET_NAME} --project ${PROJECT_ID}"
echo "        and confirm the deny policy applied correctly with:"
echo "          gcloud iam policies list --attachment-point cloudresourcemanager.googleapis.com/projects/${PROJECT_ID} --kind denypolicies"

echo "==> 5. Creating the Cloud Run Job (image built by CI on first push;"
echo "        this bootstrap deploy is a placeholder so there is something"
echo "        to point at once the signer is actually written)"
gcloud run jobs create "${JOB_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --service-account "${CONSOLIDATOR_SA_EMAIL}" \
  --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID}" \
  --max-retries 0 \
  --task-timeout 300 \
  || echo "    (job already exists, skipping - CI's deploy step updates it going forward)"

echo "==> Done. Deliberately NOT creating a Cloud Scheduler job here,"
echo "    unlike the sweeper - consolidation of already-swept funds is"
echo "    expected to be a deliberate, manually-triggered action (e.g."
echo "    'gcloud run jobs execute ${JOB_NAME} --project ${PROJECT_ID}"
echo "    --region ${REGION}' by an authorized operator), not a routine"
echo "    cron job. If that assumption is wrong and this should run on a"
echo "    schedule after all, say so explicitly before one gets added -"
echo "    it changes the risk profile (an automated job pulling this"
echo "    secret on a fixed cadence vs. a human deliberately invoking it)."
echo ""
echo "    Next steps: the signer job itself is not written yet - it must"
echo "    use ONLY the 5 confirmed derivation paths hardcoded in this"
echo "    script's header, must derive in-memory and exit after signing,"
echo "    and must never be a long-running process. Do not write or run"
echo "    that code until it's been reviewed separately."
