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
npm test         # jest — runs all 17 suites
```

Run a single suite or a single test:

```bash
npx jest test/unit/controllers/authController.test.js
npx jest -t "should flash errors and redirect to /forgot when email is invalid"
```

`jest.config.js` uses `testMatch: ['**/test/**/*.test.js']`, so bare `jest` finds every suite. Six
other scripts (`test:unit`, `test:e2e:*`, `test:all`) used to exist and matched **zero files** —
Jest treats a positional path argument as a regex against the full path, and the `test/e2e*.test.js`
files they named never existed. They have been removed; don't reintroduce that pattern.

### Expected test baseline: 221 passed, 17 suites, 0 failures

Note that `mainRoutes.test.js` mocks every controller and both middleware modules by hand. **If you
change a module's export shape, update its mock there**, or the whole suite dies at import with
`TypeError: argument handler must be a function` — Express rejects an `undefined` handler, and that
error names the route line, not the mock. This has bitten twice: once when `getInspection` moved to
`controllers/inspection.js`, and once when `middleware/multer.js` changed from exporting a bare
multer instance to `{ uploadProfilePhoto }`. The guard mocks there also set `req.user`, because the
per-account rate limiters key on `req.user._id`.

Controller tests run the route's validator chain first through `test/unit/helpers/runValidators.js`,
inside a small per-suite helper such as `postSignup()`. Write those helpers by hand: a bulk
find-and-replace once rewrote the controller call inside the helper too, and the self-calling helper
hung Jest at 100% CPU. An endless chain of awaited promises never lets the `testTimeout` timer
fire, so run single suites under `timeout 120 npx jest --runInBand <file>` when in doubt.

`jest.config.js` has no `setupFilesAfterEnv`. The old `test/setup/` directory was removed: its
`testServer.js` was unreferenced, and its `setup.js` only loaded a `config/test.env` that doesn't
exist and set `NODE_ENV`, which no test reads. `testPathIgnorePatterns` still names
`test/config/database.test.js`, which also no longer exists — vestigial but harmless.

## Architecture

### Request pipeline (`server.js`) — order is load-bearing

`trust proxy` → helmet/CSP → static → body parsers → `method-override` → session → passport →
**`endStaleSessions`** → connect-flash → **`viewLocals`** → `routes/main.js` → 404 handler →
`errorHandler`.

- **`app.set('trust proxy', 1)` must come before any `app.use`.** Railway proxies requests; without
  it `req.ip` is the proxy, so rate limiters count every visitor as one client and `secure` session
  cookies are never set. The value is `1`, not `true` — express-rate-limit rejects `true` as
  spoofable.
- `middleware/viewLocals.js` populates `success` / `errors` / `error` / `info` / `currentPath` /
  `user` for **every** view. It calls `req.flash()` only when `req.session.flash` exists: reading a
  flash creates that object, a changed session gets saved and sent a cookie, and reading
  unconditionally gave every anonymous visitor (bots included) a cookie and a MongoDB session.
  `currentPath` uses `req.path`, not `req.originalUrl`, so `/dashboard?page=2` still matches the
  `'/dashboard'` comparisons in `views/partials/header.ejs`.
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

### Validation (`middleware/validators.js`)

One express-validator chain per form, plus `validateInspection` for the JSON save. Routes run the
chain before the controller:

```js
router.post('/signup', authLimiter, validateSignup, authController.postSignup)
```

- Every text field starts with `.isString()`: a form field can arrive as an object or a list, and
  before this a missing or non-string field made `validator.js` throw and show the 500 page.
- Controllers start with `const errors = formErrors(req)`. Form routes flash `errors.array()` and
  redirect back to their own form; `postInspection` returns a JSON 400 with the first message.
  `formErrors` keeps only `{ msg }`. The default error objects carry the typed value, and flashing
  them would store passwords in the session database.
- Controllers then read input with `matchedData(req)`, never `req.body`. That is what stops a
  client from setting `createdAt`, `_id` or the old signature fields on an inspection.
- `emailField()` trims and runs `normalizeEmail({ gmail_remove_dots: false })`, the clean-up the app
  has always used, and rewrites `req.body.email` in place. passport-local reads that field, so
  login sees the normalized address. Changing the options would stop existing accounts from matching.
- Signup requires the Terms checkbox (`terms` is `"on"` when ticked) and records `termsAcceptedAt`.
- The inspection modal's `maxlength` attributes mirror `validateInspection` and the schema's
  `maxLength`s (truck 30, trailer 60, remarks 2000, dates 20). Change all three together.

### MongoDB guard (`config/database.js`)

`mongoose.set('sanitizeFilter', true)` neutralizes `$` operators that arrive in request data. Every
operator the app writes into a query filter must be wrapped, as in `findUserByResetToken` in
`controllers/reset.js`: `resetPasswordExpires: mongoose.trusted({ $gt: Date.now() })`. Unwrapped,
it is rewritten to `{ $eq: { $gt: ... } }`, which fails to cast on a Date path, and the page shows a
500. Updates such as the counter's `$inc` aren't filters and aren't affected.

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

### Sessions end after a password reset

A reset sets `passwordChangedAt` on the account. `endStaleSessions` (middleware/auth.js, right after
`passport.session()` in server.js) signs out any session whose `req.session.loginAt` is older, so
whoever knew the old password loses access on every other device. Anything that logs a user in must
call `markLoginTime(req)` inside the `req.login` callback. passport regenerates the session on login,
so setting it earlier is lost. `postLogin`, `postSignup` and `postRecoverPassword` already do.

`GET /reset/:token` checks the link before showing the form and sends an unknown or expired one to
`/forgot` with a flash.

### Rate limits (`middleware/rateLimiters.js`)

| Limiter | Routes | Limit | Keyed by | Response |
|---|---|---|---|---|
| `authLimiter` | POST /login, /signup | 20 / 15 min | IP | flash + redirect to the same path |
| `passwordResetLimiter` | POST /forgot, /reset/:token | 5 / hour | IP | flash + redirect |
| `counterLimiter` | POST /inspections/count | 30 / 15 min | IP | JSON 429 |
| `inspectionSaveLimiter` | POST /inspections | 60 / 15 min | account | JSON 429 |
| `photoUploadLimiter` | POST /profile/photo | 10 / hour | account | flash + redirect to /profile |

The per-account limiters must run after `ensureAuth`/`ensureAuthApi`, which guarantee `req.user`.
`photoUploadLimiter` runs before multer, so a blocked upload never writes a temp file. A route
with no GET page of its own passes `flashAndRedirect(message, redirectTo)` its destination.

### Logout is POST, and reset tokens stay out of logs and analytics

- `POST /logout` comes from a small form in `views/partials/header.ejs`. There is deliberately no
  GET route, because another site could sign users out by linking to it. `.site-header__logoutBtn`
  resets the button so it looks exactly like the menu links.
- A reset token is in the reset page's URL. `injectGA()` in `public/js/main.js` returns early on
  `/reset/` paths, and `server.js` overrides morgan's `url` token so the log shows `/reset/:token`.
  Keep both in step if the reset URL ever changes shape.

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

### CSP: no inline scripts or handlers, and a hash that can go stale

`scriptSrc` has **no `'unsafe-inline'`**, and `scriptSrcAttr` is absent so it defaults to `'none'`.
That means **an inline `onclick`/`onsubmit` will silently not fire** — use `addEventListener` in
`public/js/main.js` instead. `.profileCard__deleteForm` is the pattern to copy.

The one inline `<script>` is the JSON-LD block in `head.ejs`, allowed by a SHA-256 hash in
`server.js`. **Editing that block — even its whitespace — invalidates the hash and silently blocks
the structured data.** Regenerate with:

```bash
node -e "const fs=require('fs'),c=require('crypto');const m=fs.readFileSync('views/partials/head.ejs','utf8').match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);console.log(\"'sha256-\"+c.createHash('sha256').update(m[1],'utf8').digest('base64')+\"'\")"
```

`upgradeInsecureRequests` is production-only; it rewrites `http://` to `https://` and breaks local dev.

### EJS escaping gotcha

`<%=` escapes its output, so **you cannot emit markup or HTML entities through it**. Two bugs in this
repo came from that: `'&mdash;'` rendered as literal text, and
`<%= cond ? 'aria-current="page"' : '' %>` produced `aria-current=&#34;page&#34;`. Put the attribute
in the template and let EJS supply only the value; use literal Unicode characters (`—`) instead of
entities. Reserve `<%-` for `include()`.

## Environment and deploy

- **`.env` lives at `config/.env`, not the project root.** Both `server.js` and
  `middleware/cloudinary.js` load it with an explicit `{ path: './config/.env' }`. A root `.env` is
  silently ignored. `config/.env.example` lists every key with no values; add new keys there too.
- Variables read by the code: `DB_STRING`, `SESSION_SECRET`, `PORT`, `NODE_ENV`, `BASE_URL`,
  `EMAILNAME`, `EMAILPASSWORD`, `CLOUD_NAME`, `API_KEY`, `API_SECRET`.
- **`BASE_URL` is required for password reset emails.** The link is built from it only, never from
  the `Host` header, which the client controls. Without it, `POST /forgot` fails with a 500 and
  `server.js` logs a warning at startup in production.
- **`engines: { node: "22.x" }` in `package.json` is load-bearing — do not remove it.** Railway's
  Nixpacks reads it to pick a Node version. `mongodb`/`mongoose` require `>=20.19.0` and call the
  global `crypto.getRandomValues`, which does not exist on Node 18. Without the pin, Railway
  defaulted to Node 18 and production crash-looped on `ReferenceError: crypto is not defined`.
- A push to `main` is a production deploy. The `pretriq` Railway service owns `pretriq.com`.
  A second service, `permissible-wool`, builds from this same repo but has no domain and points at a
  different database.