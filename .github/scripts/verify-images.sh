#!/usr/bin/env bash
# Security and completeness checks of the CI/CD images, run before any push.
#   verify-images.sh backend  <image> <expected migration count>
#   verify-images.sh frontend <image> <expected public apiUrl> <path of the repository nginx.conf>
# Allow-list: what the application needs at run time must be present. Deny-list: secrets, per-environment files,
# sources control data, tests, build toolchains. Only paths and variable names are printed, never contents.
set -euo pipefail

fail() { echo "::error::$*"; exit 1; }

# Image metadata: no configuration in Env, Labels or the build history.
check_metadata() {
  local image="$1" names
  names="$(docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}{{range $k, $v := .Config.Labels}}{{println $k}}{{end}}' "$image" | cut -d= -f1)"
  if grep -Eiq '(SECRET|PASSW|TOKEN|CREDENTIAL|PRIVATE|_KEY|AWS_|CLARISA_|DB_|JWT|LDAP)' <<< "$names"; then
    fail "$image declares configuration-like variables or labels: $(grep -Ei '(SECRET|PASSW|TOKEN|CREDENTIAL|PRIVATE|_KEY|AWS_|CLARISA_|DB_|JWT|LDAP)' <<< "$names" | tr '\n' ' ')"
  fi
  if docker history --no-trunc --format '{{.CreatedBy}}' "$image" | grep -Eq 'AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY'; then
    fail "$image build history contains credential-like text"
  fi
}

check_backend() {
  local image="$1" migrations="$2"
  [[ "$migrations" =~ ^[0-9]+$ ]] && (( migrations > 0 )) || fail "invalid expected migration count"
  check_metadata "$image"

  docker run --rm -i --entrypoint sh "$image" -s "$migrations" <<'EOF'
set -u
cd /app
status=0
need() { [ -e "$1" ] || { echo "::error::backend image is missing $1"; status=1; }; }
deny() { [ ! -e "$1" ] || { echo "::error::backend image must not contain $1"; status=1; }; }

# Compiled application and its runtime configuration module
need dist/src/main.js
need dist/src/shared/config/config.js
grep -q 'CLARISA_AD_CONFIG_JSON' dist/src/shared/config/config.js \
  || { echo '::error::compiled config module does not read CLARISA_AD_CONFIG_JSON'; status=1; }
cmp -s src/shared/config/config.ts docker/cicd-config.ts.template \
  || { echo '::error::src/shared/config/config.ts is not the CI/CD environment-reading module'; status=1; }
# Legacy migration command: npm run migration:execute (ts-node over src/ormconfig.ts and migrations/*.ts)
need package.json
grep -q '"migration:execute"' package.json || { echo '::error::package.json lacks migration:execute'; status=1; }
need src/ormconfig.ts
need node_modules/.bin/ts-node
need node_modules/typeorm/cli.js
found=$(find migrations -name '*.ts' | wc -l)
[ "$found" -eq "$1" ] || { echo "::error::backend image has $found migrations, expected $1"; status=1; }

# Nothing secret, per-environment or unneeded
leaks=$(find /app -path /app/node_modules -prune -o \( -name '.env' -o -name '.env.*' -o -name '*.spec.ts' \
  -o -name 'config.ts.example' -o -name '.git' -o -name 'coverage' \) -print)
[ -z "$leaks" ] || { echo '::error::backend image contains:'; echo "$leaks"; status=1; }
deny test
for tool in g++ make python3; do
  ! command -v "$tool" > /dev/null 2>&1 || { echo "::error::build tool $tool is in the runtime image"; status=1; }
done
exit "$status"
EOF

  # The configuration module fails closed and never echoes the variable content.
  local out
  if out="$(docker run --rm --entrypoint node "$image" -e "require('./dist/src/shared/config/config')" 2>&1)"; then
    fail "backend starts without CLARISA_AD_CONFIG_JSON"
  fi
  grep -q 'Missing runtime configuration variable CLARISA_AD_CONFIG_JSON' <<< "$out" \
    || fail "missing CLARISA_AD_CONFIG_JSON is not reported as such"
  if out="$(docker run --rm -e CLARISA_AD_CONFIG_JSON='not-json-SENTINEL-c1a7' --entrypoint node "$image" \
      -e "require('./dist/src/shared/config/config')" 2>&1)"; then
    fail "backend accepts an invalid CLARISA_AD_CONFIG_JSON"
  fi
  ! grep -q 'SENTINEL-c1a7' <<< "$out" || fail "an invalid CLARISA_AD_CONFIG_JSON is echoed in the error output"
  docker run --rm -e CLARISA_AD_CONFIG_JSON='{"url":"ldap://ci.invalid","baseDN":"dc=ci,dc=invalid"}' \
    --entrypoint node "$image" -e "
      const c = require('./dist/src/shared/config/config').default;
      if (c.active_directory.url !== 'ldap://ci.invalid') { process.exit(1); }" \
    || fail "the configuration module does not expose CLARISA_AD_CONFIG_JSON as active_directory"

  # Every compiled module resolves with plain node (path aliases rewritten by the Nest build); no bootstrap,
  # so no database or network is touched.
  docker run --rm -e CLARISA_AD_CONFIG_JSON='{"url":"ldap://ci.invalid","baseDN":"dc=ci,dc=invalid"}' \
    --entrypoint node "$image" -e "require('./dist/src/app.module'); process.exit(0)" \
    || fail "the compiled application modules do not load with node dist/src (see the error above)"

  echo "backend image: required files present, no sensitive files, configuration module fails closed"
}

check_frontend() {
  local image="$1" api_url="$2" nginx_conf="$3"
  [ -f "$nginx_conf" ] || fail "nginx.conf not found at $nginx_conf"
  check_metadata "$image"

  docker run --rm -i --entrypoint sh "$image" -s "$api_url" <<'EOF'
set -u
html=/usr/share/nginx/html
status=0
[ -f "$html/index.html" ] || { echo '::error::frontend image is missing index.html'; status=1; }
ls "$html"/main.*.js > /dev/null 2>&1 || { echo '::error::frontend image has no main.*.js bundle'; status=1; }
# The bundle was built from the generated public environment
grep -rqF -- "$1" "$html" || { echo '::error::the bundle does not contain the expected public apiUrl'; status=1; }
# Nothing but nginx and the compiled bundle
for path in /usr/src/app /app; do
  [ ! -e "$path" ] || { echo "::error::frontend image must not contain $path"; status=1; }
done
leaks=$(find / -xdev \( -name 'environment*.ts' -o -name '.env' -o -name '.env.*' -o -name 'node_modules' \
  -o -name '*.map' \) -print 2> /dev/null)
[ -z "$leaks" ] || { echo '::error::frontend image contains:'; echo "$leaks"; status=1; }
# Keys the application never reads must not be compiled in; no credential-like text in the bundle
! grep -rq 'tawkToId' "$html" || { echo '::error::the bundle contains tawkToId'; status=1; }
! grep -rEq 'AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY' "$html" \
  || { echo '::error::the bundle contains credential-like text'; status=1; }
exit "$status"
EOF

  docker run --rm --entrypoint cat "$image" /etc/nginx/nginx.conf | cmp -s - "$nginx_conf" \
    || fail "the image nginx.conf differs from the repository file"
  echo "frontend image: bundle and nginx.conf present, no sources, environment files, source maps or secrets"
}

case "${1:-}" in
  backend)  (( $# == 3 )) || fail "usage: $0 backend <image> <expected migration count>"; check_backend "$2" "$3" ;;
  frontend) (( $# == 4 )) || fail "usage: $0 frontend <image> <expected apiUrl> <nginx.conf>"; check_frontend "$2" "$3" "$4" ;;
  *) fail "usage: $0 backend|frontend ..." ;;
esac
