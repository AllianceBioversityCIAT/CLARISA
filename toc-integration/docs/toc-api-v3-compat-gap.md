# Brecha de compatibilidad: toc-integration vs. ToC API v3 (NestJS + MySQL)

Cruce entre los documentos del equipo ToC / PRMS Planning (`TOC_API_Changes_for_Consumers.pdf` y `TOC-Public-API-Guide.pdf`, ambos del 7 sep 2026) y el código de `toc-integration` tal como estaba el 7 sep 2026 (rama `dev-toc-integration`).

## 0. Estado de implementación (2026-09-08)

Los fixes se implementaron en la rama `dev-toc-integration` en tres lotes. Esquema: correr `docs/sql/toc_results-add-location.sql`, `toc_results_regions-create.sql` y `toc_results_countries-create.sql` **antes** del deploy (ya aplicados en la BD de pruebas).

| # | Hallazgo | Estado | Dónde |
|---|----------|--------|-------|
| 1 | Work packages `ost_wp.toc_id` | Resuelto (lote 1). `toc_id` = uuid del nodo WP cuando no viene; si la fila ya existe se conserva su `toc_id`. `initiative_id ?? initiativeId`. | `ToCWorkPackages.ts`, `TocResultServices.saveTocResultsV2` |
| 2 | SDG `smo_code` / `full_name` / `indicators[].id` | Resuelto (lote 1) | `TocSdgsResults.ts` |
| 3 | Indicadores: tipo, unidad, geo, baseline, `location` | Resuelto (lote 1). `type_value` mapeado al value space legado; `location` en minúsculas; geo plural; baseline = total de la grilla. | `TocResultServices.tocResultsIndicatorV2`, `src/utils/toc-v3.ts` |
| 4 | `POST /toc/version` | **Corrección del hallazgo:** el script Python manda el uuid estable del ToC (`original_id`), que el API v3 sí acepta. El endpoint estaba "muerto" solo para uuids de versión reales. Resuelto (lote 3): la URL ahora manda `?phase_id=`, se verifica `original_id`/`version_id` antes de escribir, y un `version` distinto se reporta como warning sin abortar. | `TocServicesResult.versionSplitInformation` |
| 5 | `POST /toc` legado | Mantenido con guarda (lote 3): no desactiva indicadores si la lista llega vacía; `wp_id` string se guarda en `toc_results.wp_id`. | `TocResultServices.saveTocResults`, `tocResultsIndicator` |
| 6 | `phase` objeto | Resuelto (lote 1) en los tres flujos con `resolveEnvelopePhase`. `reporting_year` se toma del envelope; `/phases` queda como fallback. AVISA acepta `phaseId` en el body. Nuevo: si el ToC sirve una fase distinta a la pedida → 409 `PHASE_MISMATCH` sin escrituras. | `TocServicesResult.ts` |
| 7 | Synergy `program` → `flow_*` | Resuelto (lote 2). `flow_last_update` cae a `program.version`. | `saveResultSynergyProgramsV2` |
| 8 | MELIA | Resuelto (lote 2) | `saveResultMeliasV2` |
| 9 | WP `initiative_id` | Resuelto (lote 1) | `ToCWorkPackages.ts` |
| 10 | Guardas de plausibilidad | Resuelto (lote 1): 0 nodos de resultado → 422; 0 indicadores con indicadores activos en BD → 409. Slack `:alert:`. Sin escrituras. | `src/services/TocSyncGuards.ts` |
| 11 | Partners `source` | Resuelto (lote 2). Partners `source: "TOC"` traen códigos sintéticos 900000xxx que no existen en CLARISA: avisar a PRMS. | `saveResultPartnersV2` |
| 12 | HTTP | Resuelto (lote 1): timeout 60 s, 404 → respuesta 404 `TOC_NOT_FOUND` sin alerta. `serverless.yml` con `timeout: 120` (API Gateway sigue cortando al cliente a 30 s; la Lambda termina y Slack reporta). | `src/utils/toc-http.ts`, `src/types/toc-sync-error.ts`, `serverless.yml` |

**Nuevo en BD:** `toc_results.location` (minúsculas, null si el ToC manda null) y las tablas `toc_results_regions` / `toc_results_countries` enlazadas por `toc_results.id`. Solo se persisten; la API de lectura (consumida por STAR y TIP) no cambia. PRMS lee la BD directamente.

**Verificado en BD de pruebas (SP01 v38, Phase 2026):** 21 OUTPUT / 13 OUTCOME / 3 EOI; 5 AOW con join íntegro; 415 indicadores activos (los otros 5 del root no están ligados a ningún nodo de resultado); `type_value` custom 206 / innovations 109 / knowledge 61 / capacity 26 / vacío 7 / innovation use 5 / policy 1; `location` country 394 / global 21; 394 filas de país por indicador (antes 0 en toda la tabla); 425 partners con `source`; 20 sinergias con título; 3 vínculos MELIA con tipo; Phase 2025 sin cambios (fingerprint idéntico).

**Diferido (no pedido por PRMS aún):** `indicator_sub_type`, `portfolio_outcomes`, `is_actor_a_partner` / `is_this_outcome_mapped_to_a_portfolio_outcome`, baselines por centro, derivar `is_global`, `DEFAULT_REPORTING_YEAR`.

**Aviso a PRMS:** el value space de `toc_results.wp_id` cambia para filas nuevas de 2026 (uuid del nodo WP en vez del id OST); las tablas de geo por indicador empiezan a poblarse; `location` de indicador sigue en minúsculas.

---

**Contexto.** El 4 de septiembre de 2026 `https://toc.mel.cgiar.org/api` pasó a servir el nuevo backend. La URL no cambió, así que cualquier sync que se dispare hoy ya habla con el API nuevo. Todo lo que sigue fue verificado el 7 sep 2026 con respuestas reales de `GET /toc/SP01` (versión 38, Phase 2026), `GET /toc/last-updates`, `GET /phases?limit=50` y `GET /toc/SP01/dashboard-result`.

---

## 1. Resumen ejecutivo

| # | Severidad | Área | Qué pasa hoy si se corre el sync | Archivo |
|---|-----------|------|----------------------------------|---------|
| 1 | **Crítica** | Work packages (AOW) | `ost_wp.toc_id` ya no existe → **0 AOW guardados** y `wp_id = NULL` en todos los results. El API de lectura devuelve `wp_short_name: null`. | `ToCWorkPackages.ts:37-45`, `TocResultServices.ts:877-887` |
| 2 | **Crítica** | SDG | `type.usndCode` → `type.smo_code`, `type.fullName` → `type.full_name`. `sdg_id` y `sdg_contribution` quedan NULL. Indicadores SDG leen `target_id` que ya no existe → **0 indicadores SDG**. | `TocSdgsResults.ts:243-250, 352` |
| 3 | **Crítica** | Indicadores | `type.value`/`type.name` → `""`; `unit_of_measurement` es objeto → `""`; regiones/países del indicador se leen de `region`/`country` (singular) pero el API manda `regions`/`countries` → **geo vacío**. | `TocResultServices.ts:1199-1224, 1280-1283` |
| 4 | **Crítica** | `POST /toc/version` | `GET /toc/{version_id}` devuelve **404** en el API nuevo (solo acepta uuid del ToC o código SP). El endpoint está muerto. | `TocServicesResult.ts:350` |
| 5 | **Crítica** | `POST /toc` (legacy) | `dashboard-result.output_outcome_results[].indicators` es **siempre `[]`** → el flujo legacy desactiva todos los indicadores existentes. `wp_id` ahora es string (`SP01-AOW05`) y se descarta. | `TocServicesResult.ts:80-196`, `TocResultServices.ts:100-103, 230-234` |
| 6 | **Alta** | `phase` | Ahora es objeto `{ id, name, … }`. El flujo SP cae al `phaseId` solicitado (funciona por accidente). El flujo AVISA guarda **`phase = NULL`**. | `TocServicesResult.ts:237-240, 697-700` |
| 7 | **Alta** | Synergy programs | `item.flow` → `item.program`; `flow_id`, `related_node_id`, `flow.last_update` desaparecen. Todas las columnas `flow_*` quedan NULL y el API de lectura las expone así a PRMS. | `TocResultServices.ts:1647-1710` |
| 8 | **Media** | MELIA | `melia_type` → `type` (y `type.title` → `type.name`); `country`/`region` → `countries`/`regions`; `reported_indicators_count` es número, no `{low, high}`; `center.toc_id` no existe. | `TocResultServices.ts:1790-1874` |
| 9 | **Media** | Work packages | `ost_wp.initiativeId` → `ost_wp.initiative_id` → columna `initiativeId` NULL. | `ToCWorkPackages.ts:79-83` |
| 10 | **Media** | Seguridad del sync | No hay guardas contra el "hueco de migración" (§5 del PDF de cambios): indicadores/targets se borran y reinsertan sin verificar plausibilidad. | `TocResultServices.ts:1121-1124, 1391-1401` |
| 11 | **Baja** | Partners | `toc_id` ya no viene (NULL). `code` ahora llega en el 100 %. `add_source` → `source`. | `TocResultServices.ts:1604-1612` |
| 12 | **Baja** | HTTP | 404 se trata como error genérico. Timeout de 20 s vs. 60 s recomendados. Sin retry. | `TocServicesResult.ts:213-217` |

**Lo que sí está bien y no requiere cambios:** el envelope raíz (`data`, `relations`, `original_id`, `version_id`, `version`, `toc_type`); el upsert por `(related_node_id, phase)`; `related_node_id == id` en nodos; parseo de targets por grilla de años con `centers[].code` y `projects[].code`; Impact Areas (`type.id` numérico, `type.description`, `global_target[].targetId`, `indicators[].indicatorId`); SDG targets (`targets[].id`); `responsible_organization.code`; parseo de `/phases` desde `data[]`; los UUID de fase hardcodeados en `sp-sync-meta.ts` coinciden con producción. El flujo V2 **no filtra por `flow_id`**, así que la trampa del "grafo vacío" (§3.2 del PDF) no aplica.

---

## 2. Detalle por hallazgo

### 2.1 Work packages: `ost_wp.toc_id` desapareció (crítico)

Payload real de un nodo `WP` en SP01:

```json
"ost_wp": {
  "wp_official_code": "SP01-AOW02", "source": "clarisa", "name": "Accelerated Breeding",
  "acronym": "AOW02", "initiative_id": "SP01", "creation_date": "…", "updating_date": "…"
}
```

No hay `toc_id` ni `initiativeId`. El PDF de cambios lo confirma: *"ost_wp.toc_id removed with no equivalent"*.

Efecto en cadena:

1. `ToCWorkPackages.saveWorkPackagesV2` hace `if (!officialCode || !tocId) continue;` → ningún AOW se persiste. Slack reporta `WPs (AOW)=0`.
2. `TocResultServices.saveTocResultsV2` construye `workPackageMap` con `node.ost_wp.toc_id` → mapa vacío. El fallback consulta `toc_work_packages` por `id`/`toc_id` del nodo y fase; para una fase nueva (2026) no hay filas → `wp_id = NULL` en todos los results.
3. `GET /toc/results/category/:category/initiative/:code` devuelve `work_package_id: null`, `wp_short_name: null`.

**Decisión de diseño necesaria.** El nodo `WP` sí trae un `id` estable (el mismo que `group` en los results y `wp.id` embebido). Opciones:

- **A. Usar `node.id` como `toc_id`** cuando `ost_wp.toc_id` no venga. Las filas 2026 quedan consistentes entre `toc_results.wp_id` y `toc_work_packages.toc_id`. Riesgo: al re-sincronizar 2025, `findExistingWorkPackage` encuentra la fila vieja por `(wp_official_code, year)` y el `update` intentaría cambiar la PK `toc_id`, rompiendo el join de los results 2025 ya guardados. Hay que **conservar el `toc_id` existente** cuando el match sea por código oficial.
- **B. Usar `wp_official_code` como clave de join** en el API de lectura (ya está indexado). Más robusto a largo plazo, pero cambia el contrato de `work_package_id` para PRMS.

Recomendación: A ahora (mínimo cambio), evaluar B en el plan multi-fase.

### 2.2 SDG: campos renombrados (crítico)

| Código lee | API v3 trae | Efecto |
|------------|-------------|--------|
| `type.usndCode` | `type.smo_code` (`10`) | `sdg_id = NULL` |
| `type.fullName` | `type.full_name` | `sdg_contribution = NULL` |
| `indicators[].target_id` | `indicators[].id` (`127`), `sdgTargetId` | **Todos los indicadores SDG se saltan** |
| `targets[].id` | `targets[].id` (`81`) | OK |

Este cambio **no está en el PDF de cambios** (el equipo Planning no consume nodos SDG); sí está en la guía §5.5. Verificado en vivo.

### 2.3 Indicadores cuantitativos (crítico)

Forma real de un indicador en SP01:

```json
{
  "id": "…", "toc_id": "dc81f773-…", "description": "…", "result_level": "OUTPUT",
  "indicator_type": { "id": "6f6b7777-…", "name": "Innovation Development", "source": "SYSTEM", … },
  "indicator_sub_type": null,
  "unit_of_measurement": { "id": "cf6ae688-…", "value": "Number", "toc_id": "…" },
  "location": "Country",
  "regions": [], "countries": [ { "code": 834, "name": "Tanzania, United Republic", "isoAlpha2": "TZ", "isoAlpha3": "TZA" } ],
  "targets": [ { "2020": 0, …, "2026": 2, …, "total": 2, "common_id": "…", "centers": [...], "projects": [...] } ],
  "baselines": [ { "2020": 0, …, "total": 0, "common_id": "…" } ],
  "targets_totals": { "2025": "0", "2026": "2", …, "total": "2" }
}
```

No existen `type`, `related_node_id`, `flow_id`, `main`, `region`, `country`, `baseline`, `target`.

| Columna BD | Código lee | Qué pasa | Corrección |
|------------|-----------|----------|------------|
| `unit_messurament` | `unit_of_measurement` como string | `""` | `unit_of_measurement?.value ?? unit_of_measurement` (la guía §9 avisa que snapshots viejos traen string) |
| `type_value` | `type.value` | `""` | Mapear `indicator_type.name` al value space legacy con la tabla de Planning (abajo) para no romper agregaciones en PRMS |
| `type_name` | `type.name` | `""` | `indicator_type.name` |
| `location` | `location` | `"Country"` en vez de `"country"` | Persistir tal cual pero **avisar a PRMS**: cualquier comparación estricta en minúsculas deja de matchear. Alternativa: normalizar a minúsculas al guardar para no cambiar el contrato de lectura |
| `baseline_value` | `baselines[0].value` | `""` | Leer grilla de años igual que targets (o `baselines_totals.total`) |
| geo regiones/países | `ind.region` / `ind.country` | **vacío** | Pasar `ind.regions ?? ind.region`, `ind.countries ?? ind.country`. Nota: en `TocResultServices.ts:1276-1279` ya se calcula `geo` con el fallback plural, pero **no se usa**; la llamada de la línea 1280 vuelve a leer solo singular. Bug preexistente que ahora se manifiesta. |
| `related_node_id` | `related_node_id` → fallback `ind.id` | OK | Nada. Ojo: `toc_id` del indicador es el uuid del **programa**, no del indicador; no usarlo como identidad. |
| `main` | `main` | `false` | Campo desaparecido; aceptar |

Mapeo `indicator_type.name` → `type.value` legacy (validado por Planning sobre 818 indicadores, sin pérdida):

| `indicator_type.name` (nuevo) | `type.value` legacy |
|-------------------------------|---------------------|
| Innovation Development | Number of innovations (innovation development) |
| Innovation Use | Innovation Use |
| Knowledge Products | Number of knowledge products |
| Capacity Sharing | Number of people trained (capacity sharing for development) |
| Policy Change | Number of Policy (Policy Change) |
| Other Outputs / Other Outcomes | custom |
| `null` / desconocido | pasar tal cual |

Distribución real en SP01 v38: Other Outputs 198, Innovation Development 110, Knowledge Products 61, Capacity Sharing 26, Other Outcomes 11, null 8, Innovation Use 5, Policy Change 1.

### 2.4 `POST /toc/version` quedó sin backend (crítico)

`versionSplitInformation` hace `GET ${LINK_TOC}/api/toc/${versionId}`. El API v3 solo resuelve `{tocId}` como uuid del ToC o código de programa (guía §2.1). Probado en vivo con el `version_id` de SP01: **404**. La única forma de pedir una versión distinta a la última es `?phase_id=`. Opciones: eliminar el endpoint, o reimplementarlo como `POST /toc/sp` con `phaseId` y validar que `response.version_id === versionId` antes de escribir.

### 2.5 `POST /toc` legacy sobre `dashboard-result` (crítico si alguien lo usa)

`dashboard-result` sigue existiendo y mantiene `from`/`to` (no `from_id`/`to_id`) y `phase` como string, así que `TocOutputOutcomeRelations` sigue funcionando. Pero:

- `output_outcome_results[].indicators` es **siempre `[]`** (guía §7). `tocResultsIndicator` primero marca `is_active = false` a todos los indicadores del result y luego no inserta nada → **borrado lógico masivo** de indicadores legacy.
- `wp_id` es ahora el código oficial (`"SP01-AOW05"`), no un número → `work_packages_id = NULL`.
- La consulta a `${OST_DB}.tocs` para obtener `official_code` sigue dependiendo de la BD OST, ajena al API.

Si este flujo ya no se usa en producción, conviene deshabilitarlo o protegerlo con la guarda de §2.10 antes de que alguien lo dispare por costumbre.

### 2.6 `phase` es objeto (alta)

```json
"phase": { "id": "7baf200a-…", "name": "Phase 2026", "reporting_year": 2026, "start_date": "…", "end_date": "…", "active": true, "status": "Open", … }
```

- `spSplitInformation` (línea 237-240): `typeof phase === "string"` falla → usa `phaseId` de la request. Funciona, pero pierde la confirmación de qué fase sirvió el ToC (justo lo que el plan multi-fase quería).
- `avisaSplitInformation` (línea 697-700): `phase: null` → filas con `phase = NULL`, lookups sin fase, y como la URL no lleva `?phase_id=` el ToC entrega la última versión (hoy Phase 2026).

Corrección: `const phaseFromResponse = phase?.id ?? phase;` en los tres flujos. Bonus: `phase.reporting_year` ya viene en el envelope, así que `fetchReportingYear()` puede pasar a ser fallback en vez de llamada obligatoria (el plan de Phase 2026 asumía que no venía).

### 2.7 Synergy programs (alta)

Forma real a nivel de nodo:

```json
{ "id": "…", "toc_id": "…", "program_id": "…", "description": "…", "creation_date": "…", "updating_date": "…",
  "program": { "id": "…", "initiative_id": "SP05", "title": "…", "type": "…", "wp_type": "…", "status": "…",
               "status_reason": "…", "project_state": "…", "cgiar_project": true, "approved": true, "archive": false,
               "organization_id": "…", "diagram_image": "…", "creation_date": "…", "version": 12, "main": true,
               "latest": true, "publish_reason": null, "related_toc_id": "…", "initiative": { "code": "SP05", … } } }
```

El código lee `item.flow` (→ `program`), `item.flow_id` (→ `program_id`), `item.related_node_id` (no existe), `flow.last_update` (→ no existe; el más parecido es `program.version`). Resultado: solo `synergy_id` y `description` se llenan; todo `flow_*` NULL. Como `getTocResultsByCategoryAndCode` expone `synergy_programs[].flow.*`, PRMS recibiría un objeto de nulls.

A nivel raíz `synergy_programs[]` además trae `type` (`"synergy programs"` | `"indicator"`), `result` y `wp`. El PDF advierte que estuvo vacío durante la transición; hoy trae 21 filas en SP01.

### 2.8 MELIA (media)

| Código lee | API v3 | Efecto |
|-----------|--------|--------|
| `melia_type.{id,title,description,color,main,creation_date}` | `type.{id,name,description}` (`id` numérico) | `melia_type_*` NULL |
| `country`, `region` | `countries`, `regions` | geo vacío |
| `center.toc_id` | no existe (`center.code` sí) | NULL |
| `reported_indicators_count.{low,high}` | número (`0`) | NULL |
| `flow`, `flow_id` | no existen | NULL |

### 2.9 Work packages: `initiativeId` (media)

`ost_wp.initiativeId` → `ost_wp.initiative_id`. Leer ambos. `wp_type` no viene en el nodo WP del v3 (era del `flow`).

### 2.10 Guardas contra el hueco de migración (media)

El PDF §5 documenta que durante la transición hubo programas con 20 outputs y 0 indicadores, y que un consumidor que "marca como borrado lo que falta" habría marcado ~USD 90 M de presupuesto. En `toc-integration`:

- `saveTocResultsV2` desactiva results por título ausente, pero solo si `incomingTitles.size > 0`. **Bien.**
- `tocResultsIndicatorV2` marca `is_active = false` a todos los indicadores del result y reinserta lo que llegue. Sin guarda.
- `saveIndicatorTargetV2` hace `delete` de targets antes de insertar. Sin guarda.
- `saveResultPartnersV2`, `saveResultProjectsV2`, `saveResultSynergyProgramsV2`, `saveResultMeliasV2` hacen `delete` + insert. Sin guarda.

Propuesta mínima: antes de escribir, contar `quantitative_indicators` a nivel raíz; si es 0 y la BD tiene indicadores activos para ese `(original_id, phase)`, abortar con Slack alert. Idem si `data.filter(OUTPUT|OUTCOME|EOI).length === 0`.

### 2.11 Partners (baja)

`toc_id` e `id` ya no vienen; llegan `code` (100 % poblado), `partnerCode`, `acronym`, `name`, `legacy_ids`, `source`, `websiteLink`, `added`. Cambiar `add_source` → `source`. `toc_id` queda NULL; evaluar si la columna sigue teniendo sentido.

### 2.12 HTTP y operación (baja)

- 404 ahora es real (`{ "message": "Not Found", "statusCode": 404 }`) y es **normal** para un programa que no publicó en la fase pedida (guía §8.1). Hoy axios lanza, se manda `:alert:` a Slack y el endpoint responde 500. Debería responder algo como 404 "sin datos para esa fase" sin alarmar.
- Timeout 20 s; la guía recomienda 60 s. SP01 pesa 1.5 MB comprimido, va bien, pero programas grandes pueden pasar.
- Axios en Node ya manda `Accept-Encoding` por defecto, así que la compresión está cubierta.
- El API no tiene rate limit pero pide no descargar exports completos sin necesidad. `toc_results.version_id` ya existe: se puede comparar contra `last-updates[].version_id` y saltar el sync si no cambió (guía §3.3).
- `DEFAULT_REPORTING_YEAR = 2025` mientras la fase activa en ToC es 2026. Decisión de negocio, no bug, pero conviene revisarla junto con PRMS.

---

## 3. Lo que NO cambió (confirmado)

- `id` de nodos, de AOW, de MELIA y de indicadores son idénticos entre API viejo y nuevo. No hay remapeo.
- `original_id` es el uuid estable del programa; `version_id` cambia por publicación (y puede cambiar sin que `version` cambie: republicación in-place).
- `GET /toc/{key}` acepta uuid o código (`SP01`) y `?phase_id=`.
- Categorías `WP / OUTPUT / OUTCOME / EOI / IA / SDG` (más `AA`, que SP01 no tiene) en mayúsculas.
- Los UUID de fase 2025 (`99134294-…`) y 2026 (`7baf200a-…`) coinciden con `sp-sync-meta.ts`.
- `/phases` devuelve `{ data, meta, links }`; el parser actual ya lo soporta.

---

## 4. Orden sugerido de corrección

1. **Bloqueantes de datos** (sin esto el sync 2026 escribe basura): §2.1 work packages, §2.2 SDG, §2.3 indicadores, §2.6 `phase?.id`.
2. **Integridad**: §2.10 guardas de plausibilidad. Hacerlo antes de correr contra producción.
3. **Consumidores PRMS**: §2.7 synergy `program` → `flow_*`, §2.8 MELIA, decidir contrato de `location` (mayúscula vs minúscula).
4. **Limpieza**: §2.4 retirar o reimplementar `POST /toc/version`; §2.5 deshabilitar `POST /toc` legacy o protegerlo; §2.9, §2.11, §2.12.
5. **Verificación**: sync SP01 Phase 2026 en dev y comparar conteos con el payload (SP01 v38: 21 OUTPUT, 13 OUTCOME, 3 EOI, 5 WP, 5 IA, 5 SDG, 420 indicadores cuantitativos, 69 relaciones, 1 MELIA, 65 proyectos, 21 sinergias).

---

## 5. Preguntas abiertas para el equipo ToC / PRMS

1. ¿Existe o existirá algún equivalente a `ost_wp.toc_id`? Si no, ¿PRMS acepta `node.id` como `work_package_id` o prefiere `wp_official_code`?
2. `location` en mayúsculas: ¿lo normalizamos a minúsculas al guardar para no romper a PRMS, o PRMS se adapta?
3. ¿Se sigue necesitando `POST /toc/version`? El API nuevo no permite pedir una versión por su uuid.
4. ¿Sigue vivo el flujo legacy `POST /toc` (dashboard-result)? Hoy borraría indicadores.
5. `indicator_type.name` vs mapeo legacy en `type_value`: ¿PRMS ya migró su clasificación o necesita el value space viejo?
