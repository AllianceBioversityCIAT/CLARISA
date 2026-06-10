# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLARISA-Front is an Angular 14 web application for the CLARISA (Comprehensive Linking of Actors and Results In Science and Agriculture) platform. It provides a public landing page and an authenticated admin panel for managing API documentation, users, roles, and partner requests.

## Commands

- **Dev server:** `ng serve` (localhost:4200, auto-reload)
- **Build:** `ng build` (production) or `ng build --configuration development`
- **Run all tests:** `npm test` (Jest)
- **Run tests in watch mode:** `npm run test:watch`
- **Run a single test file:** `npx jest --testPathPattern="file-name.spec.ts"`
- **Run tests with coverage:** `npm run test:coverage`
- **Scaffolding:** `ng generate component|service|module|pipe|guard <name>`

## Architecture

### Module Structure (Lazy-Loaded)

```
app/
├── landing-page/          # Public-facing pages (home, dashboards, API docs, FAQ, login)
├── clarisa-panel/         # Authenticated area (route-guarded)
│   ├── documentation/     # API endpoint documentation viewer
│   └── manage/            # User/role/partner-request management
└── shared/                # Cross-cutting: auth, interceptors, reusable components, interfaces
```

The app uses two top-level lazy-loaded routes: `landing-page` (public) and `clarisa-panel` (protected by `LoginGuardGuard`). Each feature area is its own Angular module with further lazy-loaded children.

### Authentication

- JWT stored in `localStorage` (`token` key)
- `LoginGuardGuard` protects `clarisa-panel` routes
- `GeneralInterceptorService` attaches `Authorization: Bearer <token>` to all API requests
- `AuthService` handles login/logout and token management

### API Services Pattern

Services are `@Injectable({ providedIn: 'root' })`, inject `HttpClient`, and return Observables. Base URL comes from `environment.apiUrl`. Convention: prefix injected services with underscore (e.g., `private _manageApiService: ManageApiService`).

### State Management

No external state library — uses RxJS Observables and component-level state. Services expose data via `HttpClient` Observables; components subscribe in `ngOnInit`.

### UI Libraries

- **PrimeNG** (v14) — primary component library (tables, dialogs, dropdowns, buttons)
- **CoreUI** (v4) — layout and navigation
- **DynamicTableFiltersComponent** — shared reusable table with filtering, sorting, and export (Excel/PDF/CSV via `xlsx` and `jspdf`)

### Environment Config

`src/environments/environment.ts` holds: `apiUrl`, `googleAnalyticsId`, `tawkToId`, `clarityProjectId`. Test API: `https://clarisatest-back.ciat.cgiar.org/`

## Code Conventions

### Formatting (Prettier)

- 2-space indent, single quotes, no trailing commas, 150 char print width, Angular parser for HTML

### Commit Messages

Use conventional commits with emoji prefix:

```
✨ feat(<scope>): add new feature
🐛 fix(<scope>): fix bug description
♻️ refactor(<scope>): restructure something
📝 docs(<scope>): update documentation
✅ test(<scope>): add or fix tests
🎨 style(<scope>): formatting changes
🚀 perf(<scope>): performance improvement
🔧 chore(<scope>): tooling/config changes
```

Subject: imperative present tense, lowercase, no trailing period.

### File Naming

- Components: `kebab-case.component.ts` + `.html` + `.scss`
- Services: `kebab-case.service.ts`
- Modules: `kebab-case.module.ts`
- Tests: colocated as `*.spec.ts`
- Component selector prefix: `app-`

## Testing

- Framework: Jest + jest-preset-angular (runs in Node, no browser needed)
- Test files are colocated with their source files
- Coverage output: `./coverage/clarisa-front`
- Use `TestBed` for component/service setup with async `compileComponents()`
- Config: `jest.config.js` (root), `setup-jest.ts` (root), `tsconfig.spec.json`
