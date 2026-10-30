# Glossary parity (live e2e)

Proves that the public glossary is intact after a change: every endpoint and the
landing page serve the same terms with the same information. Read-only.

```bash
# 1. Before the deploy: record what the environment answers today (and self-check it)
GLOSSARY_BASE=https://clarisatest-back.ciat.cgiar.org/ \
GLOSSARY_SNAPSHOT_OUT=/tmp/glossary-before \
npm run glossary:parity

# 2. After the deploy: exact comparison, plus the page
GLOSSARY_BASE=https://clarisatest-back.ciat.cgiar.org/ \
GLOSSARY_GOLDEN=/tmp/glossary-before \
GLOSSARY_WEB=https://clarisatest-web.ciat.cgiar.org/ \
npm run glossary:parity
```

What it checks without a snapshot: `api/glossary` (default, `show=active|all|inactive`),
`dashboard`, `get/:id` for every term, `export` (json, csv, skos) and, where deployed,
`api/v2/glossary` — all 200, 11 keys per term, consistent with each other. With
`GLOSSARY_GOLDEN`: each variant equal to the snapshot term by term, field by field
(the failure names the term and the field). With `GLOSSARY_WEB`: the page lists every
active concept with its name and one of its definitions verbatim, and the permalink of
a term shows exactly that term. The page check needs Playwright, which is not a
dependency of the project: `npm i --no-save playwright && npx playwright install chromium`.
