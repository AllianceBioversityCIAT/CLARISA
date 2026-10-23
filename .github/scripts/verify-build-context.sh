#!/usr/bin/env bash
# Proves that each <unit>/Dockerfile.cicd.dockerignore applies to its build: plants canary files where secrets and
# local artifacts would be, builds the `context-probe` stage (a plain copy of the build context) and fails if any
# canary or sensitive path reached it, or if a file the build needs is missing. Canaries are removed on exit.
# Run from the repository root of a clean checkout; needs Docker with BuildKit.
set -euo pipefail
export DOCKER_BUILDKIT=1

marker="clarisa-ci-canary-$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
canaries=(
  clarisa-back/.env
  clarisa-back/.env.local
  clarisa-back/src/shared/config/config.ts
  clarisa-back/node_modules/.canary
  clarisa-back/dist/.canary
  clarisa-front/.env
  clarisa-front/src/environments/environment.ts
  clarisa-front/src/environments/environment.prod.ts
  clarisa-front/node_modules/.canary
  clarisa-front/dist/.canary
)
created_files=()
created_dirs=()

cleanup() {
  local path
  for path in "${created_files[@]}"; do rm -f -- "$path"; done
  for path in "${created_dirs[@]}"; do rmdir -- "$path" 2> /dev/null || true; done
  docker image rm -f clarisa-context-probe:back clarisa-context-probe:front > /dev/null 2>&1 || true
}
trap cleanup EXIT

for path in "${canaries[@]}"; do
  if [ -e "$path" ]; then
    echo "::error::$path already exists: run this check on a clean checkout (nothing is overwritten)"
    exit 1
  fi
  dir="$(dirname "$path")"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    created_dirs+=("$dir")
  fi
  printf '%s\n' "$marker" > "$path"
  created_files+=("$path")
done

# probe <unit dir> <tag> <files that must reach the context>...
probe() {
  local unit="$1" tag="$2"
  shift 2
  docker build --quiet --file "$unit/Dockerfile.cicd" --target context-probe --tag "$tag" "$unit" > /dev/null
  local leaks
  # Paths only are printed, never file contents.
  leaks="$(docker run --rm --entrypoint sh "$tag" -c '
    grep -rls -- "$1" /ctx
    for p in .env node_modules dist .git; do [ ! -e "/ctx/$p" ] || echo "/ctx/$p"; done
  ' sh "$marker")"
  if [ -n "$leaks" ]; then
    echo "::error::$unit/Dockerfile.cicd.dockerignore does not exclude:"
    printf '%s\n' "$leaks"
    return 1
  fi
  local required
  for required in "$@"; do
    docker run --rm --entrypoint test "$tag" -e "/ctx/$required" \
      || { echo "::error::$unit build context is missing $required"; return 1; }
  done
  echo "$unit: build context excludes every canary and keeps the required files"
}

probe clarisa-back clarisa-context-probe:back \
  package.json package-lock.json docker/cicd-config.ts.template src/main.ts src/ormconfig.ts migrations tsconfig.build.json
probe clarisa-front clarisa-context-probe:front \
  package.json package-lock.json angular.json nginx.conf src/main.ts
