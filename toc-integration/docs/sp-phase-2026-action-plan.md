# Plan de acción: soporte multi-fase ToC SP (Phase 2026)

Documento de planificación para habilitar la sincronización de Science Programs (`POST /toc/sp`) con **Phase 2026** sin sobrescribir datos de Phase 2025, alineado con la Epic [P2-3009](https://cgiarmel.atlassian.net/browse/P2-3009) (early reporting SP09 / S4I).

**Estado actual:** Milestones 1–3 implementados en código — pendiente pruebas en BD (M5) y deploy (M6).

**Riesgo si se cambia solo el `phase_id` hardcodeado:** los registros en `toc_results` se **sobrescriben** (upsert por `related_node_id` sin `phase`).

---

## Objetivo

Permitir que `toc-integration` almacene y exponga **coexistencia de fases** (2025 + 2026) para un mismo SP (ej. SP09), con:

- `phase` (UUID) como discriminador principal en `toc_results`
- `year` (`reporting_year`) poblado en `toc_work_packages`
- API de lectura filtrable por fase (`?phase=`)
- Sync idempotente por fase (re-ejecutar no destruye otra fase)

---

## Alcance

| In scope | Out of scope (fase 2) |
|----------|----------------------|
| Flujo `POST /toc/sp` (`spSplitInformation`) | Flujo legacy `POST /toc` (`splitInformation`) |
| Tablas V2: results, work packages, SDG, IA | Migración masiva histórica de todas las fases |
| SP09 Phase 2026 como primer caso | Cambios en PRMS front (solo contrato API) |
| Documentación + pruebas manuales SP09 | Re-sync automático programado (cron) |

---

## Envelope del response ToC (raíz del JSON)

Al final del payload de `GET LINK_TOC/api/toc/{spId}?phase_id={uuid}` llega metadata de contexto (ejemplo SP09 Phase 2026):

```json
{
  "data": [ "... nodos del ToC ..." ],
  "relations": [ "..." ],
  "original_id": "a5b6ffc9-17e6-4cba-bef9-edc4eb572a0b",
  "version_id": "fec97cd3-1314-4117-84cc-a2e56bcc1b2a",
  "version": 23,
  "phase": "7baf200a-c958-4ded-9894-6557a94cae18",
  "toc_type": "Scaling programs",
  "toc_level_type": "AOW"
}
```

### Mapeo request → response → BD

| Campo ToC | Origen | Uso actual en código | Columna / destino BD | Phase 2025 vs 2026 |
|-----------|--------|----------------------|----------------------|-------------------|
| `phase_id` (query) | **Request** `?phase_id=` | Hardcodeado en URL (2025) | — | Cambiar a `7baf200a-...` para pedir data 2026 |
| `phase` | **Response** raíz | ✅ `meta.phase` → todos los saves V2 | `toc_results.phase`, SDG, IA | `99134294-...` → `7baf200a-...` |
| `original_id` | **Response** raíz | ✅ `meta.original_id` | `toc_results.id_toc_initiative` | **Igual** (`a5b6ffc9-...`) — es el UUID del SP en ToC |
| `version_id` | **Response** raíz | ✅ `meta.version_id` | `toc_results.version_id` | **Cambia** (`2500a816-...` → `fec97cd3-...`) |
| `version` | **Response** raíz | ❌ No usado | — | 23 en 2026; candidato a log/auditoría |
| `toc_type` | **Response** raíz | ❌ No usado | — | `"Scaling programs"` — validación opcional |
| `toc_level_type` | **Response** raíz | ❌ No usado | — | `"AOW"` — coherente con SP/AOW structure |
| `reporting_year` | **No viene en response** | ❌ | `toc_work_packages.year` | Requiere `GET /api/phases/{phase}` |

### Implicaciones clave

1. **No hace falta parsear `phase` del body manualmente** si confías en el response: ToC devuelve el UUID de la fase que efectivamente sirvió. El código ya hace:

   ```typescript
   const { data, phase, original_id, version_id } = response.data;
   ```

2. **Lo que sí hay que parametrizar es el query `phase_id`** en la URL de fetch (hoy hardcodeado a 2025). El `phase` del response es la confirmación de qué fase se persistió.

3. **`original_id` ≠ `official_code`**: para SP09, `spId` en el POST es `"SP09"` pero `original_id` es `a5b6ffc9-...`. Ambos se usan:
   - `official_code` → filtro API lectura, deactivation, negocio
   - `id_toc_initiative` / `original_id` → identidad ToC interna

4. **`reporting_year` sigue faltando** en el envelope. Para `toc_work_packages.year` mantener la llamada complementaria:

   ```http
   GET LINK_TOC/api/phases/7baf200a-c958-4ded-9894-6557a94cae18
   → { "reporting_year": 2026, "name": "Phase 2026", ... }
   ```

   Alternativa: usar el `phase` del response como input de ese fetch (una sola fuente de verdad post-response).

5. **Comparación SP09 HLO 5.5.1** con metadata 2026:

   | Campo | 2025 en BD | 2026 (response + nodos) |
   |-------|------------|-------------------------|
   | `id_toc_initiative` | `a5b6ffc9-...` | `a5b6ffc9-...` (mismo `original_id`) |
   | `phase` | `99134294-...` | `7baf200a-...` |
   | `version_id` | `2500a816-...` | `fec97cd3-...` |
   | `related_node_id` | `5a8bb976-...` | `5a8bb976-...` (estable entre fases) |
   | `toc_result_id` (item.id) | `43bb8c8c-...` | `e958c20e-...` (cambia por versión ToC) |

---

## Fases del plan

### Fase 0 — Validación y preparación (0.5–1 día)

**Objetivo:** Confirmar supuestos con datos reales antes de tocar código.

| # | Tarea | Responsable | Entregable |
|---|-------|-------------|------------|
| 0.1 | Obtener UUID Phase 2026 desde ToC (`7baf200a-c958-4ded-9894-6557a94cae18` o el vigente en prod) | Dev | UUID confirmado |
| 0.2 | Ejecutar `GET LINK_TOC/api/phases/{phase_id}` y validar `reporting_year: 2026` | Dev | JSON de referencia |
| 0.3 | Ejecutar `GET LINK_TOC/api/toc/SP09?phase_id={phase_2026}` y guardar payload sample | Dev | Archivo JSON de prueba |
| 0.4 | Contar registros actuales SP09 en BD por fase (`toc_results`, `toc_work_packages`) | Dev | Baseline SQL |
| 0.5 | Validar con negocio: ¿2025 debe seguir consultable en paralelo? (asumido: **sí**) | PO/Ángel | Confirmación escrita |

**Criterio de salida:** baseline documentado + confirmación de coexistencia multi-fase.

---

### Fase 1 — Corrección crítica de upsert (1–2 días)

**Objetivo:** Evitar que sync 2026 pise filas 2025.

#### 1.1 `saveTocResultsV2` — clave compuesta

**Archivo:** `src/services/TocResultServices.ts`

**Cambio:**

```typescript
// ANTES
where: { related_node_id: record.related_node_id }

// DESPUÉS
where: {
  related_node_id: record.related_node_id,
  phase: record.phase,
}
```

Aplicar en `findOne`, `update` e `insert`.

**Impacto:** mismo `related_node_id` + distinta `phase` → **INSERT** nueva fila; 2025 intacto.

#### 1.2 Índice único en BD (recomendado)

```sql
-- Verificar duplicados antes de crear índice
SELECT related_node_id, phase, COUNT(*)
FROM toc_results
WHERE related_node_id IS NOT NULL AND phase IS NOT NULL
GROUP BY related_node_id, phase
HAVING COUNT(*) > 1;

-- Si no hay conflictos:
CREATE UNIQUE INDEX uq_toc_results_related_node_phase
ON toc_results (related_node_id, phase);
```

#### 1.3 Revisar cascada de indicadores

Los indicadores usan `toc_results_id` (PK autoincrement del padre). Con padres separados por fase, la cascada queda aislada **siempre que** el upsert del padre sea por fase.

**Verificar:** `tocResultsIndicatorV2`, `saveIndicatorTargetV2`, relaciones SDG/IA del result — no deben buscar solo por `related_node_id` del result sin considerar fase del padre.

| # | Tarea | Archivo(s) | Prioridad |
|---|-------|------------|-----------|
| 1.1 | Upsert `(related_node_id, phase)` en results | `TocResultServices.ts` | P0 |
| 1.2 | Auditar indicadores/targets/projects/partners V2 | `TocResultServices.ts` | P0 |
| 1.3 | Script/migración índice único | BD `Integration_information` | P1 |

**Criterio de salida:** sync 2026 en dev crea filas nuevas; conteo 2025 sin cambios.

---

### Fase 2 — Phase parametrizable + metadata (0.5–1 día)

**Objetivo:** Eliminar hardcode del **request** y enriquecer `meta` con `reporting_year` (no viene en el envelope del ToC).

#### 2.1 Parametrizar `phase_id` en la URL de fetch (request)

**Archivo:** `src/services/TocServicesResult.ts` → `spSplitInformation`

```typescript
// ANTES
const tocHost = `${env.LINK_TOC}/api/toc/${spId}?phase_id=99134294-d7a1-4966-a63e-227c9e29b9fb`;

// DESPUÉS
const phaseId = resolvePhaseId(inputPhaseId); // body → env → fallback
const tocHost = `${env.LINK_TOC}/api/toc/${spId}?phase_id=${phaseId}`;
```

Orden de resolución de `phaseId`:

1. `req.body.phaseId` (nuevo en `POST /toc/sp`)
2. `process.env.TOC_DEFAULT_PHASE_ID`
3. Fallback 2025 solo durante transición

**El `phase` persistido** sigue saliendo del **response** (`response.data.phase`), no del input — ToC confirma la fase servida (ej. `7baf200a-...`).

#### 2.2 Fetch complementario de fase (solo para `reporting_year`)

El envelope del ToC **no incluye** `reporting_year`. Tras recibir el response (o usando el `phaseId` del request):

```typescript
interface TocPhaseMeta {
  id: string;
  reporting_year: number;
  name: string;
  status: string;
}

async function fetchPhaseMeta(phaseId: string): Promise<TocPhaseMeta> {
  const { data } = await axios.get(`${env.LINK_TOC}/api/phases/${phaseId}`);
  return data;
}
```

Extender `meta` (campos del response + año de phases API):

```typescript
const { data, phase, original_id, version_id, version, toc_type } = response.data;
const phaseMeta = await fetchPhaseMeta(phase); // usar phase del response

const meta = {
  phase: String(phase),
  reporting_year: phaseMeta.reporting_year,
  original_id: String(original_id),
  version_id: String(version_id),
  version: typeof version === "number" ? version : null,
  toc_type: typeof toc_type === "string" ? toc_type : null,
  official_code: spId,
};
```

#### 2.3 Campos nuevos opcionales (baja prioridad)

| Campo | Acción sugerida |
|-------|-----------------|
| `version` | Log + Slack notification |
| `toc_type` | Validar `"Scaling programs"` antes de sync; warn si mismatch |
| `toc_level_type` | Documentación; no persistir por ahora |

| # | Tarea | Prioridad |
|---|-------|-----------|
| 2.1 | `phaseId` en body/env → query `?phase_id=` | P0 |
| 2.2 | `fetchPhaseMeta(phase)` → `meta.reporting_year` | P0 |
| 2.3 | Extender `meta` con `version`, `toc_type` (log/validación) | P2 |
| 2.4 | Actualizar `.env.example` con `TOC_DEFAULT_PHASE_ID` | P2 |

**Criterio de salida:** `POST /toc/sp { spId: "SP09", phaseId: "7baf200a-..." }` persiste `phase` del response y `year=2026` en work packages.

---

### Fase 3 — `toc_work_packages.year` (1 día)

**Objetivo:** Poblar `year` desde `reporting_year` de la fase.

#### 3.1 Pasar `meta` a work packages

**Archivo:** `src/services/ToCWorkPackages.ts`

```typescript
async saveWorkPackagesV2(
  data: any[],
  meta: { reporting_year?: number | null; phase?: string | null }
)
```

```typescript
year: meta?.reporting_year ?? (
  typeof ost?.year === "number" ? ost.year : null
),
```

#### 3.2 Estrategia de upsert por año

**Problema actual:** PK = `toc_id` only → colisión entre fases si `toc_id` se reutiliza.

**Opción recomendada (sin migración de PK):**

```typescript
const existing = await repo.findOne({
  where: { toc_id: tocId, year: record.year },
});
// fallback si year null en registros legacy:
// findOne({ toc_id }) where year IS NULL → update y set year
```

**Opción robusta (requiere migración):**

- Índice único `(wp_official_code, year)` o `(toc_id, year)`
- Evaluar si `toc_id` cambia entre fases para el mismo AOW (validar con payload SP09)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 3.1 | `saveWorkPackagesV2(data, meta)` | P0 |
| 3.2 | Lookup `(toc_id, year)` | P0 |
| 3.3 | Backfill `year=2025` en WPs existentes (script one-off) | P1 |
| 3.4 | Migración índice `(toc_id, year)` si aplica | P2 |

**Criterio de salida:** tras sync 2026, `SELECT * FROM toc_work_packages WHERE wp_official_code LIKE 'AOW%' AND year=2026` retorna filas.

---

### Fase 4 — API de lectura y contrato (0.5 día)

**Objetivo:** Consumidores (PRMS) consulten la fase correcta.

**Ya existe:** `GET /toc/results/category/:category/initiative/:official_code?phase={uuid}`

| # | Tarea | Prioridad |
|---|-------|-----------|
| 4.1 | Documentar Phase 2026 UUID en `docs/toc-results-api.md` | P1 |
| 4.2 | Opcional: query `?year=2026` que resuelva phase vía tabla/cache | P2 |
| 4.3 | Join results ↔ work_packages por `wp_id` + coherencia de `year` | P2 |

**Ejemplo consumo PRMS (Phase 2026):**

```http
GET /toc-integration/toc/results/category/OUTPUT/initiative/SP09?phase=7baf200a-c958-4ded-9894-6557a94cae18
```

**Criterio de salida:** respuesta 2026 no mezcla resultados 2025.

---

### Fase 5 — Pruebas (1 día)

#### 5.1 Escenarios de prueba

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| T1 | Sync SP09 Phase 2025 (baseline) | N filas con `phase=99134294...` |
| T2 | Sync SP09 Phase 2026 | M filas **nuevas** con `phase=7baf200a...` |
| T3 | Re-sync Phase 2026 (idempotencia) | Mismo conteo; datos actualizados, no duplicados |
| T4 | Consulta API `?phase=2025` vs `?phase=2026` | Conjuntos disjuntos |
| T5 | HLO 5.5.1 (`related_node_id=5a8bb976...`) | 2 filas en `toc_results` (una por fase) |
| T6 | Work packages AOW05 | Registros con `year=2025` y `year=2026` |
| T7 | Sync otro SP (SP01) Phase 2026 | No afecta SP09 |

#### 5.2 Queries de verificación

```sql
-- Conteo por fase SP09
SELECT phase, COUNT(*) FROM toc_results
WHERE official_code = 'SP09' AND is_active = 1
GROUP BY phase;

-- HLO 5.5.1 multi-fase
SELECT id, phase, toc_result_id, result_title, wp_id
FROM toc_results
WHERE related_node_id = '5a8bb976-36bf-4c1c-b7e3-5af1621297ab';

-- Work packages con year
SELECT toc_id, wp_official_code, acronym, year
FROM toc_work_packages
WHERE wp_official_code LIKE 'SP09%' OR acronym LIKE 'AOW%'
ORDER BY year, acronym;
```

**Criterio de salida:** T1–T7 pasan en ambiente de integración.

---

### Fase 6 — Despliegue SP09 (0.5 día)

Alineado con ventana P2-3010 (18–20 Jun):

| # | Paso | Notas |
|---|------|-------|
| 6.1 | Deploy `toc-integration` a staging | Con fixes Fase 1–3 |
| 6.2 | Sync SP09 Phase 2026 en staging | Validar con equipo S4I |
| 6.3 | Validar alineación AoW/HLO vs CLARISA (`global_units` year=2026) | Criterio P2-3010 |
| 6.4 | Deploy prod + sync SP09 Phase 2026 | Notificar Slack (ya integrado) |
| 6.5 | Entregar UUID Phase 2026 a equipo PRMS | Para `?phase=` en integraciones |

**Rollback:** re-sync Phase 2025 no debe borrar 2026 tras fix de upsert; rollback de código revierte a comportamiento legacy (documentar riesgo).

---

## Resumen de cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `TocServicesResult.ts` | `phaseId` param, `fetchPhaseMeta`, pasar `meta` enriquecido |
| `tocControllerResult.ts` | Aceptar `phaseId` en body de `POST /toc/sp` |
| `TocResultServices.ts` | Upsert `(related_node_id, phase)` |
| `ToCWorkPackages.ts` | Recibir `meta`, setear `year`, lookup por año |
| `.env.example` | `TOC_DEFAULT_PHASE_ID` |
| `docs/toc-results-api.md` | Phase 2026, ejemplos SP09 |
| BD (opcional) | Índices únicos, backfill year |

---

## Estimación total

| Fase | Esfuerzo |
|------|----------|
| 0 Validación | 0.5–1 d |
| 1 Upsert crítico | 1–2 d |
| 2 Phase param + fetch | 0.5–1 d |
| 3 Work packages year | 1 d |
| 4 API/docs | 0.5 d |
| 5 Pruebas | 1 d |
| 6 Deploy SP09 | 0.5 d |
| **Total** | **~5–7 días dev** |

Con paralelización (Fase 1 + 2 en paralelo): **~4–5 días**.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Sync 2026 antes del fix pisa 2025 | Alta si no se corrige Fase 1 | Alto | **No cambiar phase_id en prod** hasta deploy Fase 1 |
| `toc_id` de AOW cambia entre fases | Media | Medio | Lookup `(toc_id, year)` + fallback `wp_official_code` |
| PRMS no pasa `?phase=` en lectura | Media | Alto | Coordinar con P2-3010; default documentado |
| Desalineación ToC ↔ CLARISA entities 2026 | Media | Alto | Validar SP09-AOW* contra CLARISA API v2 |
| Indicadores huérfanos tras fix | Baja | Medio | Tests T3 + audit FK `toc_results_id` |

---

## Definition of Done

- [ ] Sync SP09 Phase 2026 crea registros **sin modificar** conteo Phase 2025
- [ ] `toc_work_packages.year` poblado con `reporting_year`
- [ ] `POST /toc/sp` acepta `phaseId`; no hardcode en prod
- [ ] API lectura retorna resultados correctos por `?phase=`
- [ ] Documentación actualizada
- [ ] Pruebas T1–T7 ejecutadas en staging
- [ ] Notificación Slack exitosa post-sync prod SP09

---

## Orden de ejecución recomendado

```text
Fase 0 (validar)
    │
    ▼
Fase 1 (upsert results) ◄── BLOQUEANTE — no sync 2026 sin esto
    │
    ├──► Fase 2 (phase param + fetch phases API)
    │
    └──► Fase 3 (work packages year)
              │
              ▼
         Fase 4 (docs/API)
              │
              ▼
         Fase 5 (pruebas)
              │
              ▼
         Fase 6 (deploy SP09 / P2-3009)
```

---

## Referencias

- Epic Jira: [P2-3009](https://cgiarmel.atlassian.net/browse/P2-3009)
- Idea origen: [NOST-442](https://cgiarmel.atlassian.net/browse/NOST-442)
- API lectura: `toc-integration/docs/toc-results-api.md`
- Entities CLARISA: `clarisa-back/src/api/cgiar-entity/docs/cgiar-entities-and-lineage.md`
- Endpoint sync: `POST /toc/sp` → `TocServicesResult.spSplitInformation`
- Phase API: `GET LINK_TOC/api/phases/{phase_id}`
