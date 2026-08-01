# Project Audit Context

This report summarizes the current ClothFlow codebase for a future production, security, and backend-logic optimization prompt. It does not reveal values from `.env` files or hardcoded credentials/secrets.

## Project Purpose And Major User Flows

ClothFlow is a garment workflow/admin system with separate admin and worker experiences.

- Admins manage styles, production stages, orders, approvals, inventory, stock, users, workers, reports, and process tracking.
- Workers view available/assigned tasks, pick work, submit completed work, track progress, view approval/payment history, and manage inventory when their worker type allows it.
- Styles define SKU, photos, sizes, colors, and production steps with per-stage prices.
- Orders are created from styles and piece matrices, then split into sub-orders and assignments.
- Production work moves through assignment statuses, sub-order approval, optional inventory readiness, and worker earnings calculations.

Important files:

- `frontend/src/App.jsx`
- `frontend/src/components/admin/StyleManagement.jsx`
- `frontend/src/components/admin/OrderManagement.jsx`
- `frontend/src/components/admin/ApprovalManagement.jsx`
- `frontend/src/components/inventory/InventoryWorkspace.jsx`
- `frontend/src/components/worker/WorkerDashboard.jsx`
- `backend/server.js`
- `backend/controllers/orderController.js`
- `backend/controllers/assignmentController.js`
- `backend/controllers/approvalController.js`
- `backend/controllers/subOrderController.js`

## Folder And Module Structure

```text
.
├── UI_ENHANCEMENT_SUMMARY.md
├── PROJECT_AUDIT_CONTEXT.md
├── backend
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   ├── config
│   │   ├── cloudinary.js
│   │   └── db.js
│   ├── controllers
│   │   ├── approvalController.js
│   │   ├── assignmentController.js
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   ├── stageController.js
│   │   ├── stockController.js
│   │   ├── styleController.js
│   │   ├── subOrderController.js
│   │   ├── userController.js
│   │   └── workerController.js
│   ├── dist
│   ├── middlewares
│   │   ├── authMiddleware.js
│   │   └── errorHandlerMiddleware.js
│   ├── models
│   │   ├── Admin.js
│   │   ├── ApprovalHistory.js
│   │   ├── Assignment.js
│   │   ├── Order.js
│   │   ├── Stage.js
│   │   ├── Stock.js
│   │   ├── StyleSchema.js
│   │   ├── SubOrderSchema.js
│   │   └── Worker.js
│   ├── routes
│   │   ├── approvalRoutes.js
│   │   ├── assignmentRoutes.js
│   │   ├── authRoutes.js
│   │   ├── order.js
│   │   ├── stageRoutes.js
│   │   ├── stockRoute.js
│   │   ├── styleRoutes.js
│   │   ├── subOrderRoutes.js
│   │   ├── userRoutes.js
│   │   └── workerRoutes.js
│   └── utils
│       └── workflow.js
└── frontend
    ├── .env
    ├── package.json
    ├── vite.config.js
    ├── vercel.json
    ├── public
    │   └── _redirects
    └── src
        ├── App.jsx
        ├── main.jsx
        ├── api
        │   └── api.js
        ├── assets
        ├── components
        │   ├── admin
        │   ├── auth
        │   ├── context
        │   ├── inventory
        │   ├── services
        │   ├── ui
        │   ├── utils
        │   └── worker
        ├── hooks
        └── utils
```

No native mobile app, worker process, queue consumer, or separate shared package was found. Mobile support is responsive web UI only.

## Technology Stack And Package Versions

Backend: Node.js, Express, MongoDB/Mongoose, Socket.IO, JWT cookie auth.

From `backend/package.json`:

- `express`: `^5.1.0`
- `mongoose`: `^8.19.1`
- `jsonwebtoken`: `^9.0.2`
- `bcryptjs`: `^3.0.2`
- `cookie-parser`: `^1.4.7`
- `cors`: `^2.8.5`
- `dotenv`: `^17.2.3`
- `helmet`: `^8.1.0`
- `morgan`: `^1.10.1`
- `socket.io`: `^4.8.1`
- `nodemon`: `^3.1.14`

Frontend: React, Vite, Tailwind CSS, Axios, React Router, Socket.IO client.

From `frontend/package.json`:

- `react`: `^19.1.1`
- `react-dom`: `^19.1.1`
- `react-router-dom`: `^7.9.4`
- `vite`: `^7.1.7`
- `@vitejs/plugin-react`: `^5.0.4`
- `tailwindcss`: `^4.1.14`
- `@tailwindcss/vite`: `^4.1.14`
- `axios`: `^1.12.2`
- `lucide-react`: `^0.545.0`
- `react-toastify`: `^11.0.5`
- `socket.io-client`: `^4.8.1`
- `react-color`: `^2.19.3`
- `eslint`: `^9.36.0`

## Frontend, Backend, Admin, Mobile, Workers, Queues, Shared Services

- Frontend web app: `frontend/src/App.jsx`, `frontend/src/main.jsx`.
- Admin screens: `frontend/src/components/admin/*`.
- Worker screens: `frontend/src/components/worker/*`.
- Shared frontend services: `frontend/src/components/services/*`.
- Shared frontend API client: `frontend/src/api/api.js`.
- Auth/user context: `frontend/src/components/context/UserContext.jsx`, `frontend/src/components/context/RequireAuth.jsx`.
- Backend API: `backend/server.js`, `backend/routes/*`, `backend/controllers/*`.
- Socket notifications: `backend/server.js`, `frontend/src/hooks/useSocket.js`.
- Queue/background worker: none found.
- Native mobile app: none found.
- Shared backend utilities: `backend/utils/workflow.js`.

## Authentication, Authorization, Roles, Permissions, Token Flow

Authentication is cookie-based JWT auth.

- Login checks `Admin` first, then `Worker`: `backend/controllers/authController.js`.
- Password hashing uses bcrypt: `backend/controllers/authController.js`, `backend/controllers/userController.js`.
- Access token and refresh token are stored as HTTP-only cookies: `backend/controllers/authController.js`.
- Refresh tokens are stored on the user document and rotated on refresh: `backend/controllers/authController.js`.
- Frontend Axios uses `withCredentials` and retries once after `/auth/refresh-token`: `frontend/src/api/api.js`.
- `/auth/me` hydrates the frontend user context: `frontend/src/components/context/UserContext.jsx`.
- Frontend route protection is role-based: `frontend/src/components/context/RequireAuth.jsx`, `frontend/src/App.jsx`.
- Backend role middleware exists: `backend/middlewares/authMiddleware.js`.

Roles:

- `admin`: `backend/models/Admin.js`.
- `worker`: `backend/models/Worker.js`.
- Worker permission specialization is represented by `workerType`: `backend/models/Worker.js`, `backend/utils/workflow.js`.

Important authorization gaps:

- Public signup can create admin users: `backend/controllers/authController.js`, `backend/routes/authRoutes.js`.
- Stock routes are public/no auth middleware: `backend/routes/stockRoute.js`.
- Approval admin actions are protected only by token, not admin role: `backend/routes/approvalRoutes.js`.
- Worker listing routes allow any authenticated user: `backend/routes/workerRoutes.js`.
- Assignment picking can use `workerId` from request body: `backend/controllers/assignmentController.js`.
- Sub-order submission does not verify worker ownership of the related assignment: `backend/controllers/subOrderController.js`.

## Database, Models, Relationships, Indexes, Migrations

Database: MongoDB via Mongoose.

Connection:

- `backend/config/db.js`

Models:

- `Admin`: name, email unique, password, phone, profile image, role, refresh token, timestamps. File: `backend/models/Admin.js`.
- `Worker`: name, email unique, password, phone, DOB, address, profile image, role, worker type, last login, timestamps. File: `backend/models/Worker.js`.
- `Stage`: unique name, sort order, active flag, timestamps. File: `backend/models/Stage.js`.
- `Style`: name, unique SKU ID, photos, sizes, colors, steps referencing stages, created date. File: `backend/models/StyleSchema.js`.
- `Stock`: vendor, color, quantity, unit price, size, date, virtual total value. File: `backend/models/Stock.js`.
- `Order`: generated order ID, style reference, style snapshot, pieces matrix, quantity, vendor, stages, priority, deadline, createdBy, timestamps. File: `backend/models/Order.js`.
- `Assignment`: order/sub-order references, stage, pieces, status, worker, completion fields, timestamps. File: `backend/models/Assignment.js`.
- `SubOrder`: order reference, generated sub-order code, pieces, current stage, progress, assignment state, approval state, earnings, inventory fields/events, timestamps. File: `backend/models/SubOrderSchema.js`.
- `ApprovalHistory`: sub-order/order references, action, actor, role, amount, status transition, metadata, timestamps. File: `backend/models/ApprovalHistory.js`.

Indexes and uniqueness:

- Admin email unique: `backend/models/Admin.js`.
- Worker email unique: `backend/models/Worker.js`.
- Stage name unique: `backend/models/Stage.js`.
- Style SKU unique: `backend/models/StyleSchema.js`.
- Order orderId unique/indexed: `backend/models/Order.js`.
- Assignment order index and worker/status index: `backend/models/Assignment.js`.
- SubOrder subOrderCode unique sparse, orderId indexed, order/orderId compound index: `backend/models/SubOrderSchema.js`.
- ApprovalHistory subOrder/createdAt, actor/createdAt, action/createdAt indexes: `backend/models/ApprovalHistory.js`.

Migrations:

- No migration framework or migration files found.

Relationship concerns:

- `Order.createdBy` references lowercase model name, which may not match the registered `Admin` model: `backend/models/Order.js`.
- `ApprovalHistory.actor` always references `Worker`, but admin actors are stored for approval actions: `backend/models/ApprovalHistory.js`, `backend/controllers/approvalController.js`.
- `Worker` has no `accountBalance` field, but approval logic increments it: `backend/models/Worker.js`, `backend/controllers/approvalController.js`.
- `Assignment` controller writes fields that are not declared in the schema, so they may not persist with strict schemas: `backend/controllers/assignmentController.js`, `backend/models/Assignment.js`.

## Main APIs And Frontend Callers

Auth:

- `POST /api/auth/signup`: `frontend/src/components/services/authServices.jsx`
- `POST /api/auth/login`: `frontend/src/components/services/authServices.jsx`, `frontend/src/components/context/UserContext.jsx`
- `POST /api/auth/logout`: `frontend/src/components/services/authServices.jsx`
- `POST /api/auth/refresh-token`: `frontend/src/api/api.js`
- `GET /api/auth/me`: `frontend/src/components/services/authServices.jsx`, `frontend/src/components/context/UserContext.jsx`

Styles and stages:

- `GET /api/styles`: `frontend/src/components/services/styleServices.jsx`, `frontend/src/components/admin/StyleManagement.jsx`, `frontend/src/components/admin/OrderManagement.jsx`
- `POST /api/styles`: `frontend/src/components/services/styleServices.jsx`, `frontend/src/components/admin/StyleManagement.jsx`
- `PATCH /api/styles/:id`: `frontend/src/components/services/styleServices.jsx`, `frontend/src/components/admin/StyleManagement.jsx`
- `DELETE /api/styles/:id`: `frontend/src/components/services/styleServices.jsx`, `frontend/src/components/admin/StyleManagement.jsx`
- `GET/POST/PATCH/DELETE /api/stages`: `frontend/src/components/services/styleServices.jsx`, `frontend/src/components/admin/StyleManagement.jsx`

Orders:

- `GET /api/orders`: `frontend/src/components/services/orderServices.jsx`, `frontend/src/components/admin/OrderManagement.jsx`, worker/process screens.
- `POST /api/orders`: `frontend/src/components/services/orderServices.jsx`, `frontend/src/components/admin/OrderManagement.jsx`
- `GET/PUT/DELETE /api/orders/:id`: `frontend/src/components/services/orderServices.jsx`

Assignments:

- `GET /api/assignments/available`: `frontend/src/components/services/assignmentServices.jsx`, `frontend/src/components/worker/AvailableTasks.jsx`, `frontend/src/components/worker/AvailableTasksTable.jsx`
- `GET /api/assignments/available-for-me`: `frontend/src/components/services/assignmentServices.jsx`, worker available-task screens.
- `GET /api/assignments/for-me`: `frontend/src/components/services/assignmentServices.jsx`, worker assigned/progress screens.
- `PATCH /api/assignments/:id/pick`: `frontend/src/components/services/assignmentServices.jsx`
- `PATCH /api/assignments/:id/complete`: `frontend/src/components/services/assignmentServices.jsx`
- `PATCH /api/assignments/:id/release`: `frontend/src/components/services/assignmentServices.jsx`

Approvals and inventory:

- `GET /api/approvals/pending`: `frontend/src/components/services/approvalServices.jsx`, `frontend/src/components/admin/ApprovalManagement.jsx`
- `POST /api/approvals/:subOrderId/approve`: `frontend/src/components/services/approvalServices.jsx`
- `POST /api/approvals/:subOrderId/reject`: `frontend/src/components/services/approvalServices.jsx`
- `GET /api/approvals/history`: `frontend/src/components/services/approvalServices.jsx`, `frontend/src/components/admin/ApprovalHistory.jsx`
- `GET /api/approvals/inventory`: `frontend/src/components/services/approvalServices.jsx`, `frontend/src/components/services/inventoryServices.jsx`, `frontend/src/components/inventory/InventoryWorkspace.jsx`
- `PATCH /api/suborders/:id/inventory`: `frontend/src/components/services/inventoryServices.jsx`
- `POST /api/suborders/:id/submit`: `frontend/src/components/services/approvalServices.jsx`, worker screens.

Users and workers:

- `GET/POST/PATCH /api/users`: `frontend/src/components/services/userServices.jsx`, `frontend/src/components/admin/UserManagement.jsx`
- `GET /api/workers`: `frontend/src/components/services/workerService.jsx`, admin/worker screens.
- `GET /api/workers/active/count`: `frontend/src/components/services/workerService.jsx`
- `GET /api/workers/:id`: `frontend/src/components/services/workerService.jsx`

Stock:

- `GET /api/stocks`, `GET /api/stocks/vendors`, `GET /api/stocks/:id`, `POST /api/stocks`, `PUT /api/stocks/:id`, `DELETE /api/stocks/:id`: `frontend/src/components/services/stockServices.jsx`, `frontend/src/components/admin/StockManagement.jsx`.

## Core Business Logic: Frontend Versus Backend

Handled mostly in frontend:

- Style table filtering, sorting, column visibility, export, responsive rendering, and client pagination: `frontend/src/components/admin/StyleManagement.jsx`.
- Style total cost display from step prices: `frontend/src/components/admin/StyleManagement.jsx`.
- Cloudinary direct image upload workflow: `frontend/src/components/admin/StyleManagement.jsx`.
- Order piece matrix construction from selected style sizes/colors: `frontend/src/components/admin/OrderManagement.jsx`.
- UI route/role gating: `frontend/src/components/context/RequireAuth.jsx`, `frontend/src/App.jsx`.
- Worker task fallback behavior between role-filtered and all available tasks: `frontend/src/components/worker/AvailableTasks.jsx`, `frontend/src/components/worker/AvailableTasksTable.jsx`.
- Client-side pagination helper: `frontend/src/hooks/useClientPagination.js`.

Handled in backend:

- Auth, token rotation, password hashing: `backend/controllers/authController.js`.
- Stage seeding and CRUD: `backend/controllers/stageController.js`.
- Style CRUD: `backend/controllers/styleController.js`.
- Order creation, quantity computation, order/sub-order/assignment generation: `backend/controllers/orderController.js`.
- Assignment claim, completion, release, progress updates: `backend/controllers/assignmentController.js`.
- Approval/rejection, internal earnings calculation, approval history: `backend/controllers/approvalController.js`.
- Inventory state update: `backend/controllers/subOrderController.js`.
- Stock CRUD and aggregate totals: `backend/controllers/stockController.js`.
- User creation/update and optional credential email: `backend/controllers/userController.js`.

Business logic that is duplicated or split:

- Workflow stage transitions are implemented in both `backend/controllers/assignmentController.js` and `backend/controllers/approvalController.js`.
- Stage/worker-type matching is split between `backend/utils/workflow.js`, assignment controllers, and frontend filtering.
- Total style cost is computed client-side but should be authoritative server-side if used for pricing/earnings.

## Sensitive Workflows

Calculations:

- Style step total cost: `frontend/src/components/admin/StyleManagement.jsx`.
- Order total quantity and distribution: `backend/controllers/orderController.js`.
- Worker payment/earnings from approved pieces and stage price: `backend/controllers/approvalController.js`.
- Sub-order progress from assignment completion counts: `backend/controllers/assignmentController.js`.
- Stock aggregate totals and virtual total value: `backend/controllers/stockController.js`, `backend/models/Stock.js`.

Validation:

- Mostly ad hoc controller validation: `backend/controllers/*`.
- Mongoose validators for basic schema fields: `backend/models/*`.
- No centralized request schema validation layer found.

Status changes:

- Assignment statuses: `backend/models/Assignment.js`, `backend/controllers/assignmentController.js`.
- Sub-order production and approval statuses: `backend/models/SubOrderSchema.js`, `backend/controllers/assignmentController.js`, `backend/controllers/approvalController.js`, `backend/controllers/subOrderController.js`.
- Inventory statuses: `backend/models/SubOrderSchema.js`, `backend/controllers/subOrderController.js`.

Approvals:

- Pending approval listing, approve, reject, history: `backend/controllers/approvalController.js`.
- Approval routes lack admin role enforcement: `backend/routes/approvalRoutes.js`.
- Rejection has a likely runtime bug due to an undefined variable: `backend/controllers/approvalController.js`.

Inventory:

- Inventory list from approvals controller: `backend/controllers/approvalController.js`.
- Inventory update with internal role check: `backend/controllers/subOrderController.js`.
- Stock inventory has unauthenticated CRUD routes: `backend/routes/stockRoute.js`.

OTP:

- No OTP workflow found.

Uploads:

- Frontend uploads directly to Cloudinary using public frontend environment values: `frontend/src/components/admin/StyleManagement.jsx`.
- Backend Cloudinary config exists but no backend upload route was found: `backend/config/cloudinary.js`.

Notifications:

- Socket.IO worker approval/update event: `backend/server.js`, `backend/controllers/approvalController.js`, `frontend/src/hooks/useSocket.js`.
- Toast notifications in frontend components.

Payment:

- No payment integration found.
- Internal worker earnings/payment amount calculation exists, but no payment gateway, payment SDK, webhook, checkout, transfer, or settlement integration was found.

## Hardcoded Secrets, URLs, Credentials, Configuration

Values are intentionally not shown. Review these file paths:

- `backend/.env`
- `frontend/.env`
- `backend/server.js`
- `backend/middlewares/authMiddleware.js`
- `backend/controllers/authController.js`
- `backend/config/cloudinary.js`
- `frontend/src/api/api.js`
- `frontend/src/hooks/useSocket.js`
- `frontend/src/components/admin/StyleManagement.jsx`
- `frontend/src/components/auth/LoginForm.jsx`
- `frontend/src/hooks/useAuth.js`
- `frontend/vite.config.js`

## Environment Variables

Environment files present:

- `backend/.env`
- `frontend/.env`

Backend environment variables referenced:

- `DATABASE_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRESIn`
- `REFRESH_TOKEN_EXPIRESIn`
- `PORT`
- `NODE_ENV`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Frontend environment variables referenced:

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

Naming concern:

- Token expiry env names use `ExpiresIn` with a lowercase `n`: `backend/controllers/authController.js`.

## Security Protections Currently Implemented

Implemented:

- Password hashing with bcrypt: `backend/controllers/authController.js`, `backend/controllers/userController.js`.
- HTTP-only auth cookies: `backend/controllers/authController.js`.
- JWT access-token verification middleware: `backend/middlewares/authMiddleware.js`.
- Role middleware exists: `backend/middlewares/authMiddleware.js`.
- Helmet enabled: `backend/server.js`.
- CORS allow-list function enabled for Express and Socket.IO: `backend/server.js`.
- Basic Mongoose validation and indexes: `backend/models/*`.
- Some MongoDB transactions for assignment completion, approvals, and sub-order submission: `backend/controllers/assignmentController.js`, `backend/controllers/approvalController.js`, `backend/controllers/subOrderController.js`.
- Some ownership check for completing/releasing assignments: `backend/controllers/assignmentController.js`.
- Inventory update role check: `backend/controllers/subOrderController.js`.
- Morgan request logging: `backend/server.js`.
- Central error handler: `backend/middlewares/errorHandlerMiddleware.js`.

Missing or weak:

- No rate limiting on login/signup/refresh or other endpoints.
- No CSRF protection despite cookie auth.
- Authorization gaps on stock, approval, signup, worker listing, assignment claim, and sub-order submission.
- Sensitive token/cookie logging exists.
- Direct unsigned frontend upload flow lacks backend validation/scanning.
- No upload file size/type enforcement found on backend.
- No consistent request validation schema layer.
- Error handling can expose raw messages.
- No ownership checks on several read/list routes.

## Performance Setup

Pagination:

- Stock API has server pagination: `backend/controllers/stockController.js`.
- Approval history has server pagination: `backend/controllers/approvalController.js`.
- Style table uses client-side pagination with 8 visible rows per page: `frontend/src/components/admin/StyleManagement.jsx`, `frontend/src/hooks/useClientPagination.js`.
- Many endpoints return full lists: styles, orders, assignments, users, workers, pending approvals, inventory.

Caching:

- No application caching layer found.

Database queries:

- Several controllers use populate and then in-memory filtering/enrichment: `backend/controllers/assignmentController.js`, `backend/controllers/approvalController.js`, `backend/controllers/workerController.js`.
- Stock filtering uses MongoDB queries and aggregation: `backend/controllers/stockController.js`.

Indexes:

- See database section. Indexes exist on core lookup fields, but more compound indexes may be needed for status/stage/worker/date list queries.

Background jobs, queues, retries, timeouts:

- No queue system found.
- No retry or timeout policy found for external email/upload workflows.

Large-list handling:

- Client-side filtering and pagination are common: `frontend/src/components/admin/StyleManagement.jsx`, `frontend/src/hooks/useClientPagination.js`.
- Server-side pagination is incomplete across primary admin lists.

## Tests, Linting, Build, Deployment, Production Config

Backend scripts:

- `npm start`: `node server.js`
- `npm run dev`: `nodemon server.js`
- `npm test`: placeholder failure
- File: `backend/package.json`

Frontend scripts:

- `npm run dev`: `vite`
- `npm run build`: `vite build`
- `npm run lint`: `eslint .`
- `npm run preview`: `vite preview`
- File: `frontend/package.json`

Tests:

- No real automated test suite found.

Lint/type checking:

- ESLint is configured through frontend dependencies.
- No TypeScript project found.
- Known lint debt exists in frontend components and hooks.

Build/deployment:

- Frontend Vercel config: `frontend/vercel.json`.
- SPA redirect config: `frontend/public/_redirects`.
- Backend serves `frontend/dist`: `backend/server.js`.
- Built output directories are present: `frontend/dist`, `backend/dist`.

## Known Bugs, Risky Code, Incomplete Features, Technical Debt

- Approval rejection references an undefined variable and can fail at runtime: `backend/controllers/approvalController.js`.
- Worker earnings/account balance update targets a missing schema field: `backend/controllers/approvalController.js`, `backend/models/Worker.js`.
- Next-stage assignment creation may happen both on worker completion and admin approval, risking duplicate or premature progression: `backend/controllers/assignmentController.js`, `backend/controllers/approvalController.js`.
- `Assignment` code writes fields not declared by schema: `backend/controllers/assignmentController.js`, `backend/models/Assignment.js`.
- `Order.createdBy` model reference likely mismatches Admin model name: `backend/models/Order.js`.
- `ApprovalHistory.actor` cannot accurately reference both admin and worker actors with current schema: `backend/models/ApprovalHistory.js`.
- `patchAssignment` frontend service calls a route that does not exist: `frontend/src/components/services/assignmentServices.jsx`, `backend/routes/assignmentRoutes.js`.
- Demo auth hook and login UI contain hardcoded demo credentials: `frontend/src/hooks/useAuth.js`, `frontend/src/components/auth/LoginForm.jsx`.
- Many screens rely on client-side business rules and filtering instead of backend-enforced rules.
- Backend route-level authorization is inconsistent.
- Backend has duplicate error handlers: `backend/server.js`, `backend/middlewares/errorHandlerMiddleware.js`.
- Build artifacts appear committed or present in source tree: `backend/dist`, `frontend/dist`.
- No migrations, tests, rate limits, CSRF protection, or queue/retry system found.

## Architecture Summary

The project is a React/Vite single-page app backed by an Express/Mongoose API. The backend exposes REST routes for auth, styles, stages, stock, orders, assignments, approvals, sub-orders, users, and workers. MongoDB stores all core records. Socket.IO is used for lightweight worker approval notifications. Admin and worker experiences share the same frontend app, API client, auth context, and service modules.

The architecture is functional for a prototype/internal tool, but production readiness is limited by inconsistent backend authorization, incomplete server-side validation, limited server pagination, frontend-heavy workflow logic, no tests, no migrations, and missing hardening around auth cookies, secrets, uploads, and sensitive logs.

## Logic That Should Move From Frontend To Backend

- Style total-cost calculation and any pricing authority: `frontend/src/components/admin/StyleManagement.jsx`.
- Style filtering/sorting/pagination for production-size lists: `frontend/src/components/admin/StyleManagement.jsx`.
- Order piece matrix validation and normalization rules: `frontend/src/components/admin/OrderManagement.jsx`, `backend/controllers/orderController.js`.
- Worker task eligibility filtering: `frontend/src/components/worker/AvailableTasks.jsx`, `frontend/src/components/worker/AvailableTasksTable.jsx`, `backend/controllers/assignmentController.js`.
- Upload validation, transformation, and persistence: `frontend/src/components/admin/StyleManagement.jsx`, `backend/config/cloudinary.js`.
- Role/permission checks currently trusted partly to frontend route protection: `frontend/src/components/context/RequireAuth.jsx`, `backend/routes/*`.
- Export/query filtering for large lists: `frontend/src/components/admin/StyleManagement.jsx` and other admin screens.

## Security Risks

### Critical

- Environment files are present in the workspace and must be protected from source control/deployment exposure: `backend/.env`, `frontend/.env`.
- JWT middleware has a literal fallback secret if env vars are absent: `backend/middlewares/authMiddleware.js`.
- Auth middleware and refresh flow log token/cookie data: `backend/middlewares/authMiddleware.js`, `backend/controllers/authController.js`.
- Stock CRUD routes have no auth middleware: `backend/routes/stockRoute.js`.
- Approval admin actions lack admin-role enforcement: `backend/routes/approvalRoutes.js`.
- Public signup can create admin accounts: `backend/controllers/authController.js`, `backend/routes/authRoutes.js`.

### High

- Sub-order submission lacks ownership verification: `backend/controllers/subOrderController.js`.
- Assignment claim accepts arbitrary worker ID from body: `backend/controllers/assignmentController.js`.
- Available assignment listing can expose all available work to any authenticated user: `backend/controllers/assignmentController.js`, `backend/routes/assignmentRoutes.js`.
- Worker list/details are available to any authenticated user: `backend/routes/workerRoutes.js`.
- User creation/update can return plaintext generated credentials: `backend/controllers/userController.js`.
- No CSRF protection for cookie-authenticated state-changing endpoints: `backend/server.js`, `backend/controllers/authController.js`.
- Direct frontend Cloudinary upload bypasses backend validation: `frontend/src/components/admin/StyleManagement.jsx`.
- Approval rejection route likely crashes due to undefined variable: `backend/controllers/approvalController.js`.

### Medium

- No rate limiting: `backend/server.js`, `backend/routes/authRoutes.js`.
- No centralized request validation layer: `backend/controllers/*`.
- User-controlled regex search is not consistently escaped: `backend/controllers/stockController.js`.
- Many list endpoints lack server pagination: `backend/controllers/styleController.js`, `backend/controllers/orderController.js`, `backend/controllers/assignmentController.js`, `backend/controllers/userController.js`, `backend/controllers/workerController.js`.
- Error responses can expose raw messages: `backend/middlewares/errorHandlerMiddleware.js`, `backend/server.js`.
- CORS allow-list and deployment origins are hardcoded: `backend/server.js`.
- Data model reference inconsistencies can break population/audit trails: `backend/models/Order.js`, `backend/models/ApprovalHistory.js`.

### Low

- Excessive console logging exists in production-facing code: `backend/controllers/*`, `frontend/src/components/*`.
- Duplicate error middleware exists: `backend/server.js`.
- Demo credentials and mock auth code remain in frontend: `frontend/src/hooks/useAuth.js`, `frontend/src/components/auth/LoginForm.jsx`.
- Build artifacts are present in project folders: `backend/dist`, `frontend/dist`.
- Inconsistent API response shapes increase frontend error-handling complexity: `backend/controllers/*`.

## Production Optimization Opportunities

- Add strict backend authorization on every route, especially stock, approval, signup, assignment, worker, and inventory routes.
- Add schema validation with a library such as Zod/Joi/Yup at API boundaries.
- Add server-side pagination, sorting, and filtering for styles, orders, assignments, users, workers, approvals, and inventory.
- Add compound indexes for common list filters: assignment status/stage/worker, sub-order status/currentStage/inventoryStatus, order createdAt/status-like fields, approval history actor/action/date.
- Move upload handling behind backend-signed upload or controlled upload endpoints.
- Remove token/cookie logging and standardize safe structured logs.
- Add auth rate limits, CSRF protection, security headers review, and stricter CORS config.
- Use MongoDB transactions for order create/delete workflows.
- Consolidate workflow transition logic so next-stage creation happens in exactly one authoritative place.
- Add automated tests for auth, role checks, order creation, assignment completion, approval/rejection, inventory transitions, and stock CRUD.
- Add migrations or versioned seed scripts for stages and schema changes.
- Add background job/retry strategy for email notifications and other external services.
- Remove committed build artifacts from source/deployment flow if not intentionally required.
- Fix frontend lint debt and add CI build/lint/test gates.

## Files Likely Requiring Changes

- `backend/server.js`
- `backend/middlewares/authMiddleware.js`
- `backend/middlewares/errorHandlerMiddleware.js`
- `backend/routes/authRoutes.js`
- `backend/routes/approvalRoutes.js`
- `backend/routes/assignmentRoutes.js`
- `backend/routes/stockRoute.js`
- `backend/routes/workerRoutes.js`
- `backend/routes/subOrderRoutes.js`
- `backend/controllers/authController.js`
- `backend/controllers/approvalController.js`
- `backend/controllers/assignmentController.js`
- `backend/controllers/orderController.js`
- `backend/controllers/stockController.js`
- `backend/controllers/styleController.js`
- `backend/controllers/subOrderController.js`
- `backend/controllers/userController.js`
- `backend/controllers/workerController.js`
- `backend/models/ApprovalHistory.js`
- `backend/models/Assignment.js`
- `backend/models/Order.js`
- `backend/models/SubOrderSchema.js`
- `backend/models/Worker.js`
- `backend/utils/workflow.js`
- `frontend/src/api/api.js`
- `frontend/src/components/context/RequireAuth.jsx`
- `frontend/src/components/context/UserContext.jsx`
- `frontend/src/components/admin/StyleManagement.jsx`
- `frontend/src/components/admin/OrderManagement.jsx`
- `frontend/src/components/admin/ApprovalManagement.jsx`
- `frontend/src/components/admin/StockManagement.jsx`
- `frontend/src/components/inventory/InventoryWorkspace.jsx`
- `frontend/src/components/services/assignmentServices.jsx`
- `frontend/src/components/services/styleServices.jsx`
- `frontend/src/components/worker/AvailableTasks.jsx`
- `frontend/src/components/worker/AvailableTasksTable.jsx`
- `frontend/src/hooks/useClientPagination.js`
- `frontend/src/hooks/useSocket.js`

## Questions That Cannot Be Answered From The Codebase

- Should public self-signup exist at all, and who is allowed to create admin accounts?
- What is the intended permission matrix for each worker type?
- Should approval create next-stage work, or should worker completion create it before approval?
- Are worker earnings meant to be payable balances, reports only, or connected to a future payment system?
- What are the production deployment targets for frontend and backend?
- Are `.env` files actually committed remotely or only present locally?
- What Cloudinary upload preset security settings are configured outside the repo?
- What is the expected maximum data volume for styles, orders, assignments, stock, and approval history?
- Are stock routes intended to be public, admin-only, or inventory-worker accessible?
- Should inventory updates be allowed by all admins and inventory workers, or narrower ownership/location rules?
- What email provider behavior is required when credential email sending fails?
- Is `backend/dist` intentionally used anywhere, or is it stale build output?
- What audit/compliance requirements apply to approvals, earnings, inventory, and deleted records?
