# Concept assistant — contract (2026-09-30, owner Yeck)

Chat beside the full concept editor. The agent NAVIGATES the form: when it talks about a field it switches to
its tab, scrolls to it, rings it and makes it blink while it types the value. It only PROPOSES: fields it fills are
marked "AI suggestion" with Accept / Undo; saving stays the normal Save button. Manual edits are logged in order
and sent with every turn so the agent knows what the person changed, where and in which order; it never
overwrites a field the person edited by hand (it proposes instead).

## Back (all under the concepts path so the MELIAF_CE permission `/api/meliaf-taxonomy/admin/meliaf/concepts` covers it)
- `GET  /api/meliaf-taxonomy/admin/:scheme/concepts-assist/status` → `{ enabled: boolean, reason?: string, remainingUsd: number }`
- `POST /api/meliaf-taxonomy/admin/:scheme/concepts-assist/chat`
  body `{ termId?: number, draft: Record<string, unknown>, messages: {role:'user'|'assistant', content:string}[] (max 20, each ≤ 4000 chars),
          edits: {seq:number, field:string, tab:string, before:unknown, after:unknown, at:string}[] (max 50) }`
  → `{ reply: string, steps: {field:string, tab:'details'|'fields', value:unknown, reason:string}[] (≤ 12), costUsd:number }`
  - `field` ∈ whitelist: preferred_label, definition, short_definition, scope_note, example_of_use, term_type,
    meliaf_function (array of list codes), meliaf_phase_primary, meliaf_phase_also (array), derivation, source_citation,
    source_url, steward, notes, and custom fields as `x:<code>` of ACTIVE fields of the scheme. Anything else dropped.
  - list-typed values must be codes of the scheme's controlled lists (server validates, drops invalid, never invents codes).
  - A field present in `edits` is never returned as a step unless the user message asks to change it; then reason says so.
  - Uses the existing OpenAI integration (`services/ai.service.ts`, key env `OPEN_AI_CLARISA_ASSISTANT_TOKEN`, model config,
    monthly USD cap `GLOBAL_CONCEPTS_AI_MONTHLY_CAP_USD`, usage accounting table). JSON-schema structured output.
    Disabled/cap reached → 503 with a human message; AI never saves anything. User text is not stored.
  - Per-user rate limit (e.g. 20 turns / 10 min) → 429.
