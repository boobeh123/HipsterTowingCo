# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**pretriq** — a full-stack Express/MongoDB/EJS app for filing FMCSA Driver's Vehicle Inspection
Reports (DVIRs) digitally. The core flow works for **guests without an account**; registered users
additionally get their reports stored in MongoDB and listed on a dashboard. Deployed on Railway at
https://pretriq.com.

## Commands

```bash
npm run dev      # nodemon server.js
npm start        # node server.js
npm test         # jest — runs all 14 suites
```

Run a single suite or a single test:

```bash
npx jest test/unit/controllers/authController.test.js
npx jest -t "should flash errors and redirect to /forgot when email is invalid"
```

### The other npm scripts are broken — use bare `npm test`

`test:unit`, `test:e2e:simple`, `test:e2e:critical`, `test:e2e:full`, `test:e2e:all` and `test:all`
all pass positional path arguments that **match zero files**. Jest treats those arguments as regexes
against full paths, and the referenced `test/e2e*.test.js` files don't exist. `jest.config.js` uses
`testMatch: ['**/test/**/*.test.js']`, which is why bare `jest` finds everything.

### Expected test baseline: 165 passed, 14 suites, 0 failures

Note that `mainRoutes.test.js` mocks every controller and both middleware modules by hand. **If you
change a module's export shape, update its mock there**, or the whole suite dies at import with
`TypeError: argument handler must be a function` — Express rejects an `undefined` handler, and that
error names the route line, not the mock. This has bitten twice: once when `getInspection` moved to
`controllers/inspection.js`, and once when `middleware/multer.js` changed from exporting a bare
multer instance to `{ uploadProfilePhoto }`.

`jest.config.js` has no `setupFilesAfterEnv`. The old `test/setup/` directory was removed: its
`testServer.js` was unreferenced, and its `setup.js` only loaded a `config/test.env` that doesn't
exist and set `NODE_ENV`, which no test reads. `testPathIgnorePatterns` still names
`test/config/database.test.js`, which also no longer exists — vestigial but harmless.

## Architecture

### Request pipeline (`server.js`) — order is load-bearing

`trust proxy` → helmet/CSP → static → body parsers → `method-override` → session → passport →
connect-flash → **res.locals middleware** → `routes/main.js` → 404 handler → `errorHandler`.

- **`app.set('trust proxy', 1)` must come before any `app.use`.** Railway proxies requests; without
  it `req.ip` is the proxy, so rate limiters count every visitor as one client and `secure` session
  cookies are never set. The value is `1`, not `true` — express-rate-limit rejects `true` as
  spoofable.
- The `res.locals` middleware populates `success` / `errors` / `error` / `info` / `currentPath` /
  `user` for **every** view. `currentPath` uses `req.path`, not `req.originalUrl`, so
  `/dashboard?page=2` still matches the `'/dashboard'` comparisons in `views/partials/header.ejs`.
- All routes live in the single `routes/main.js`. There is no per-resource route file.

### Flash-then-redirect, always with an explicit `req.session.save()`

Every controller and rate-limit handler follows this shape. The explicit save is required — without
it the redirect can outrun the session write and the flash is lost:

```js
req.flash('errors', [{ msg: '...' }])
return req.session.save((err) => {
  if (err) { return next(err) }
  res.redirect('/some-form')
})
```

`views/partials/flash.ejs` accepts either a bare string or `{ msg }`.

### Two auth guards, and the JSON/HTML split (`middleware/auth.js`)

- `ensureAuth` — page routes. Redirects to `/login`, or to `/onboard` if the user has no `name`.
- `ensureAuthApi` — JSON routes. Returns 401/403 as JSON, **and sets `req.wantsJson = true`**.

`middleware/errorHandler.js` reads that flag to decide its response format, falling back to
`req.xhr` and `req.accepts(['html','json'])`. It honors `err.status` / `err.statusCode`, guards
`res.headersSent`, renders `errors/404.ejs` or `errors/500.ejs`, and never leaks `err.message`.

Client `fetch` calls in `public/js/main.js` send `Accept: application/json` so the negotiation works
for routes without the flag (`POST /inspections/count` is unauthenticated and has no guard).

Controllers convert Mongoose `CastError` (a malformed `:id` in the URL) into the same response the
not-found path produces — a JSON 404 in `getInspection`, a flash+redirect in `deleteInspection` —
rather than letting it become a 500.

### Inspection flow — the PDF is built entirely client-side

`public/js/main.js` reads the modal form, sanitizes it, and generates the DVIR PDF with **jsPDF
loaded from cdnjs** (`views/partials/footer.ejs`), not the npm package. Then:

- **Guest**: PDF only, then `POST /inspections/count` to bump the global counter.
- **Authenticated**: same PDF, plus `POST /inspections`; the counter only increments after a
  successful save so failures don't inflate it.

The `Counter` model holds a single global document (`name: 'inspectionCount'`) powering the public
homepage count — it is not per-user.

### `public/js/utils.js` is loaded twice, two different ways

`utils.js` holds `sanitizeText`, `validateAndSanitize` and `decodeHTMLEntities`. The browser loads it
as a plain script from `views/partials/footer.ejs`, **deferred and before `main.js`**, so the
functions are globals by the time `main.js`'s handlers call them. Jest `require()`s the same file.
The `module.exports` at the bottom is wrapped in a `typeof module !== 'undefined'` guard so the
browser doesn't throw on it — **keep that guard**.

These three functions must stay **pure** — no DOM access — or they stop being testable and stop
working under `require()`. DOM feedback belongs in `main.js`; `flagMissingTruckNumber()` is the
pattern to follow. That separation exists because the functions were previously duplicated in
`main.js`, the copies drifted, and the tested version was not the shipped one.

### Uploads (`middleware/multer.js` + `controllers/profile.js`)

The module exports `uploadProfilePhoto`, a wrapper around `upload.single('file')` — not a bare
multer instance. It converts upload failures into flash+redirect instead of letting multer's
`next(err)` reach the 500 page. Extension (lowercased) and MIME type must both map to the same
allowlist entry; 5 MB cap.

In `updatePhoto`, order matters: upload to Cloudinary **first**, then destroy the old asset, so a
failed upload can't leave a user with no photo. The multer temp file is unlinked in a `finally`.
Note `file.mimetype` is client-supplied — Cloudinary is what actually validates the bytes.

### A view's required locals include every partial's

Grepping a single `.ejs` file for a variable is not enough — partials are included at render time and
share the same locals. `inspectionCount` is used only in `views/partials/inspectionModal.ejs`, which
**both** `dashboard.ejs` and `index.ejs` include, so `getDashboard` and `getIndex` must each pass it
or the page 500s at render. Grep `views/` recursively, and prefer actually rendering the template
with the controller's payload over reasoning about it.

### EJS escaping gotcha

`<%=` escapes its output, so **you cannot emit markup or HTML entities through it**. Two bugs in this
repo came from that: `'&mdash;'` rendered as literal text, and
`<%= cond ? 'aria-current="page"' : '' %>` produced `aria-current=&#34;page&#34;`. Put the attribute
in the template and let EJS supply only the value; use literal Unicode characters (`—`) instead of
entities. Reserve `<%-` for `include()`.

## Environment and deploy

- **`.env` lives at `config/.env`, not the project root.** Both `server.js` and
  `middleware/cloudinary.js` load it with an explicit `{ path: './config/.env' }`. A root `.env` is
  silently ignored. There is no `.env.example`.
- Variables read by the code: `DB_STRING`, `SESSION_SECRET`, `PORT`, `NODE_ENV`, `BASE_URL`,
  `EMAILNAME`, `EMAILPASSWORD`, `CLOUD_NAME`, `API_KEY`, `API_SECRET`.
- **`engines: { node: "22.x" }` in `package.json` is load-bearing — do not remove it.** Railway's
  Nixpacks reads it to pick a Node version. `mongodb`/`mongoose` require `>=20.19.0` and call the
  global `crypto.getRandomValues`, which does not exist on Node 18. Without the pin, Railway
  defaulted to Node 18 and production crash-looped on `ReferenceError: crypto is not defined`.
- A push to `main` is a production deploy. The `pretriq` Railway service owns `pretriq.com`.
  A second service, `permissible-wool`, builds from this same repo but has no domain and points at a
  different database.