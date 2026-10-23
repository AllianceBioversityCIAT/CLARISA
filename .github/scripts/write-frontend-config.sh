#!/usr/bin/env bash
# Writes the CLARISA DEV frontend configuration from Secrets Manager to ONE temporary file, as the Jenkins DEV job
# does (the same SecretString becomes environment.ts and environment.prod.ts). Same mechanism as the Reporting Tool
# DEV pipeline (write-frontend-config.sh of onecgiar_pr), adapted to CLARISA: the file is written OUTSIDE the
# repository and reaches clarisa-front/Dockerfile.cicd as the BuildKit secret `frontend_environment`, so it is never
# part of the build context or of an image layer.
#
# The value goes from the AWS CLI straight to the file: it is never echoed and never a step or job output; only its
# string literals are read back to register log masks. The file is mode 0600 and removed by the workflow's
# `if: always()` step.
# Usage: write-frontend-config.sh <output file outside the repository>
# Inputs (environment): SECRET_ID, AWS_REGION and the step-scoped temporary credentials.
set -euo pipefail
: "${SECRET_ID:?}" "${AWS_REGION:?}" "${GITHUB_WORKSPACE:?}"
(( $# == 1 )) || { echo "usage: $0 <output file>" >&2; exit 2; }
out="$1"

# Refuse to write inside the checkout: the file must never be part of a build context or of a commit.
case "$(cd "$(dirname "$out")" && pwd -P)/" in
  "$(cd "$GITHUB_WORKSPACE" && pwd -P)/"*) echo "::error::the frontend configuration must be written outside the repository (fail closed)"; exit 1 ;;
esac

umask 077
if ! aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$SECRET_ID" \
       --query SecretString --output text > "$out" 2> /dev/null; then
  rm -f "$out"
  # The CLI error is not printed: it may quote request details. The id is a non-secret variable.
  echo "::error::could not read the frontend configuration secret (check the build role and the secret id)"
  exit 1
fi
if [ ! -s "$out" ]; then
  rm -f "$out"
  echo "::error::the frontend configuration secret is empty (fail closed)"
  exit 1
fi

# Defense in depth only (the protection is that nothing prints the file): register every quoted string value of
# 8+ characters as a log mask, so an accidental echo in a later step of this job shows `***`.
# Workflow commands are consumed by the runner and never shown in the log.
masked=0
while IFS= read -r value; do
  value="${value%%[\'\"]}"; value="${value#[\'\"]}"
  value="${value//'%'/'%25'}"
  [ "${#value}" -ge 8 ] || continue
  echo "::add-mask::${value}"
  masked=$((masked + 1))
done < <(grep -oE "'[^'\\\\]{8,}'|\"[^\"\\\\]{8,}\"" "$out" || true)

echo "frontend configuration written (1 file outside the repository, mode 0600, ${masked} values masked)"
