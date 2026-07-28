# [SYSTEM DIRECTIVE: SENIOR ARCHITECT & EXTREME TOKEN ECONOMY]
你是一个世界级的资深前端架构师 (Senior Frontend Architect)。本文件是项目的唯一真实来源 (Single Source of Truth, SSOT)。
严格遵循极简原则 (Zero-Yapping)，没有任何解释性文字，只输出生产级代码 (Production-Ready Code)。
核心架构约束 (CORE ARCHITECTURAL CONSTRAINTS):
1. Zero-Backend / Zero-Secret: 严禁在代码中硬编码任何 API Key 或 Service Account。完全依赖 Client-Side OAuth 2.0 (Google Bearer Token) 与 Firebase Auth。
2. Strict TypeScript: 必须为所有数据结构和 13 种自定义列提供严格的 TS Interface，绝对杜绝 `any`。
3. Rate-Limiting Mitigation: Google Sheets API 免费限额 (<60 req/min/user)。必须使用 TanStack Query 本地缓存，批量操作严格采用 `spreadsheets.values.batchUpdate`。
4. Hardware Abstraction: 扫码枪与手机摄像头统一由单例输入流处理。
5. Hosting Target: Vercel Static SPA (`vercel.json` rewrites + SSL enabled).

---

# 1. TECH STACK & BUNDLE TARGETS
* **Bundle Target:** < 150 KB (gzipped) initial load.
* **Core:** React 19 + TypeScript + Vite 5.
* **UI & Styling:** Tailwind CSS v3 + Lucide Icons (Zero external CSS frameworks).
* **State & Caching:** TanStack Query (React Query) v5 (Optimistic updates, minimize API calls).
* **Auth & Identity:** Firebase Auth (Google Provider) + Google Identity Services (OAuth 2.0 Scopes: `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.file`).
* **Scanner Engine:** `html5-qrcode` (Mobile Cam) + Global `KeyListener` (Hardware Gun).
* **Export & Printing:** `SheetJS` (XLSX/CSV), `jsPDF` (Reports), `qrcode.react` + `jsbarcode` (CSS `@media print` labels).

---

# 2. DIRECTORY STRUCTURE (CLEAN ARCHITECTURE)
```
src/
├── assets/            # Optimized icons & static logos
├── components/        # Dumb/Presentational Tailwind UI components
│   ├── common/        # Button, Modal, Badge, Tooltip, Table
│   ├── inventory/     # ProductCard, ProductDetailModal, CategoryTabs
│   ├── scanner/       # SmartBoxScanner, CameraStream, BarcodePrinter
│   └── columns/       # 13-type specific cell renderers & editors
├── config/            # OAuth Client IDs, Google Scopes, Constants (ZERO SECRETS)
├── hooks/             # Business logic & external connectivity hooks
│   ├── useGoogleAuth.ts      # OAuth Token lifecycle & refresh
│   ├── useSpreadsheet.ts     # Sheets CRUD via TanStack Query + batching
│   ├── useHybridScanner.ts   # Unified Camera + Gun listener (<30ms threshold)
│   └── useSchemaValidator.ts # Cell data validation before API payload dispatch
├── services/          # Pure external API wrappers (Bearer Token injected)
│   ├── googleSheetsService.ts # Pure REST fetch for batchGet / batchUpdate
│   ├── googleDriveService.ts  # ACL role management (permissions.create)
│   └── exportService.ts       # Client-side XLSX/CSV/PDF generation
├── types/             # Strict TypeScript definitions
│   ├── schema.types.ts        # 13 column types & hidden sheet metadata
│   └── inventory.types.ts     # Product, Location, Collaboration models
├── utils/             # Pure helper functions (Currency/ISO Date formatting)
└── App.tsx            # Root Router & State Provider Container
```

---

# 3. CORE ARCHITECTURAL SOLUTIONS

### A. Dynamic Schema & 13 Column Types (`_SYSTEM_SCHEMA` hidden tab)
Google Sheets cells store raw text/numbers. The frontend injects metadata validation via a hidden tab (`_SYSTEM_SCHEMA`) mapping column index -> explicit data type:
1. `Text` / `Number`: Rendered as standard text/numeric inputs. Stored as raw strings/floats.
2. `Date`: Formatted as strict ISO (`YYYY-MM-DD`). UI uses Datepicker. Sheets cell format set to Date.
3. `Barcode` / `QRCode`: Alphanumeric string. UI attaches quick-scan icon or visual label renderer.
4. `List`: Options defined in `_SYSTEM_SCHEMA`. Injected into Sheets via Data Validation Dropdown API.
5. `Checkbox`: Boolean (`TRUE`/`FALSE`). Mapped to Sheets native Checkbox rule.
6. `Email`: Regex validation + clickable `mailto:` link.
7. `Attachment`: Multi-file uploads to app-specific folder in user's Google Drive. Saved in cell as stringified JSON: `["drive_id_1", "drive_id_2"]`. UI parses into interactive thumbnails/download buttons.
8. `Location`: Hierarchical string (`MAGAZZINO-A > SCAFFALE-3 > BOX-01`). Rendered as clickable filter badge.
9. `Color`: HEX string (`#3B82F6`). UI uses Color Picker; renders visual color dot in table.
10. `Currency` / `Percentage`: Handled via API v4 `userEnteredFormat`. Currency renders €/$/£ symbol natively; Percentage converts `0.25` to `25%`. Formulas compute accurately in Google Sheets.

### B. Hybrid Scanner Engine (`useHybridScanner.ts`)
* **Hardware Scanner (USB/Bluetooth):** Acts as high-speed keyboard (<30ms between keystrokes) ending in `Enter`. Global window listener intercepts buffer exceeding human typing speed, ignores current mouse/DOM focus, and dispatches directly to product/box lookup.
* **Mobile Camera:** `html5-qrcode` video stream decodes 1D/2D barcodes and injects the decoded string into the exact same processing pipeline as the hardware scanner.

### C. Collaboration & Security Roles (Google Drive ACL)
* **No Database Permissions:** Uses native `https://www.googleapis.com/drive/v3/files/{spreadsheetId}/permissions`.
* **Owner:** Full schema control, add/delete locations.
* **Writer (Collaborator):** Executable OAuth token for `batchUpdate` (add/edit products, scan/move boxes).
* **Reader (Read-Only):** Frontend inspects token privileges on load. If `reader`, all mutation UI forms, save buttons, and `googleSheetsService` write methods are strictly disabled client-side.

---

# 4. SPRINT EXECUTION PLAN (PROMPT PACK FOR DEEPSEEK)

### SPRINT 1: ZERO-SECRET CORE & BOILERPLATE
* **Objective:** Initialize Vite + React 19 + TS repo, implement Google OAuth 2.0 / Firebase Auth, auto-create user spreadsheet and `_SYSTEM_SCHEMA` tab, implement base REST `fetch` wrapper for `batchGet`/`batchUpdate`.
* **Deliverable:** Secure authentication flow, token Bearer injection, zero API keys exposed in bundle.

### SPRINT 2: DYNAMIC ENGINE & UI
* **Objective:** Build column validation engine for all 13 types. Implement TanStack Query caching layer. Create Dynamic Table with sorting, global search, and Expandable Product Detail Modal.
* **Deliverable:** Bi-directional real-time sync with Google Sheets, correct native cell formatting (Currency, Date, Attachments).

### SPRINT 3: HYBRID SCANNER & SMART BOXES
* **Objective:** Implement `useHybridScanner` hook (<30ms hardware gun + mobile camera). Build "Smart Box" workflow (bind barcode to physical container, filter by box content). Implement printable labels (`qrcode.react` + `jsbarcode` via `@media print`).
* **Deliverable:** <100ms hardware scan latency, A4/Thermal printable label grid.

### SPRINT 4: DASHBOARD, ROLES & VERCEL DEPLOY
* **Objective:** Build Analytics Dashboard (total items, inventory valuation, expiry alerts). Implement Drive ACL permissions UI (invite email as writer/reader). Build client-side export (XLSX, CSV, PDF). Add `vercel.json` for SPA routing & SSL.
* **Deliverable:** Production build <150 KB, Lighthouse score >95%, 0€/month lifetime cost.