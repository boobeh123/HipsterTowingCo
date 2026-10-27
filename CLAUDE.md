# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**pretriq** — a full-stack Express/MongoDB/EJS app for filing FMCSA Driver's Vehicle Inspection
Reports (DVIRs) digitally. The core flow works for **guests without an account**; registered users
additionally get their reports stored in MongoDB and listed on a dashboard. Deployed on Railway at
https://pretriq.com.

README.md is mostly Bobby's patch log, newest first. It doesn't need updating on every push. After
a batch of changes merges, add a Version History entry in the same format as the earlier ones
(heading with the next patch number, release date, developer's notes, the dashed separator).
Since Patch 1.6.024, the notes list the batch's PRs instead of describing the changes by hand:
each PR linked to its thread, with the date it merged (Hawaii time). Take them from
`gh pr list --state merged`, starting after the last PR the previous entry lists.

## Commands

```bash
npm run dev      # node --watch server.js (restarts when a loaded file changes)
npm start        # node server.js
npm test         # jest — runs all 30 suites
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

### Expected test baseline: 512 passed, 30 suites, 0 failures

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

`trust proxy` → helmet/CSP → morgan → body parsers → static → `method-override` → session →
passport → flash (`middleware/flash.js`) → **`endStaleSessions`** → **`viewLocals`** →
`routes/main.js` → 404 handler → `errorHandler`.

- `config/database.js` connects once and returns Mongoose's client. The session store reuses it
  (`MongoStore.create({ clientPromise })`), and `app.listen` runs only after the connection
  succeeds. If MongoDB can't be reached, the server logs the error and exits (Railway restarts
  it). `PORT` defaults to 3000.
- morgan logs in the `combined` format in production and `dev` locally. Static assets are
  logged too, because morgan runs before `express.static`.
- `express.urlencoded({ extended: false })`: no form uses nested field names (the inspection
  modal's bracketed names are only read by `readFormData()` and posted as JSON), so a field like
  `email[$ne]` stays a plain string key instead of becoming an object.
- Both body parsers (`urlencoded` and `json`) have `inflate: false`, so a compressed request body
  gets a 415. No browser compresses a form post or a `fetch()` body, and decompressing them put
  Node's Brotli decoder within reach of anyone (the Oct 2026 Node security release). Keep it on
  any parser added later.
- Both `dotenv.config()` calls pass `quiet: true`; dotenv 17 otherwise logs a tip line.

- **`app.set('trust proxy', 1)` must come before any `app.use`.** Railway proxies requests; without
  it `req.ip` is the proxy, so rate limiters count every visitor as one client and `secure` session
  cookies are never set. The value is `1`, not `true` — express-rate-limit rejects `true` as
  spoofable.
- `middleware/viewLocals.js` populates `success` / `errors` / `error` / `info` / `currentPath` /
  `user` / `showPrivacyNotice` for **every** view, reading all four flash types on every request.
  That's only safe because reading never writes to the session (see the flash section below):
  express-session saves a changed session and sends it a cookie, and connect-flash, which this app
  used before, created `session.flash` on every read. That once gave every anonymous visitor (bots
  included) a cookie and a MongoDB session. viewLocals.test.js checks for that with the real
  session and flash middleware.
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

`req.flash()` comes from `middleware/flash.js`, which replaced connect-flash in October 2026.
connect-flash was last released in 2013 and calls Node's deprecated `util.isArray`. The new module
keeps connect-flash's API for the two calls the app makes:

- `req.flash(type, message)` queues the message, or each item of an array, and returns how many of
  that type are queued.
- `req.flash(type)` returns that type's messages and clears them.

It differs from connect-flash in three deliberate ways:

- Reading never creates `session.flash`.
- Reading without a session returns `[]`, while writing without one throws.
- There's no `req.flash()` with no arguments, and no `%s` formatting; build the message string
  first.

It looks up `req.session` on every call, because passport regenerates the session on login and
logout, and `endStaleSessions` flashes right after `req.logout()`.

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

A reset sets `passwordChangedAt` on the account. `endStaleSessions` (middleware/auth.js, after
passport and the flash middleware in server.js) signs out any session whose `req.session.loginAt` is older,
so whoever knew the old password loses access on every other device. It then answers the request
itself: a page request is sent straight to `/login` with an info flash saying why, and a `fetch()`
caller gets a JSON 401 with the same message. It must not call `next()` for pages: `viewLocals`
would read the flash into that response and the message would be gone before the redirect. Anything that logs a user in must
call `markLoginTime(req)` inside the `req.login` callback. passport regenerates the session on login,
so setting it earlier is lost. `postLogin`, `postSignup`, `postRecoverPassword` and the profile
page's `updatePassword` already do.

The profile page (`controllers/profile.js`) changes the name (`POST /profile/name`, the same rules
as onboarding) and the password (`POST /profile/password`). A password change checks the current
password against the stored hash (`req.user` leaves the hash out, so it loads the account), refuses
a new password equal to the current one, sets `passwordChangedAt` and logs this browser in again,
so every other device is signed out and this one stays.

`GET /reset/:token` checks the link before showing the form and sends an unknown or expired one to
`/forgot` with a flash.

### Dashboard search and filters

`GET /dashboard` takes `q`, `from`, `to`, `status`, `tz` and `page`, checked by
`validateDashboardQuery`. Empty fields are skipped, and a value that fails is dropped by
`matchedData()`, with "Some filters weren't valid and were ignored." on the page. The filter
itself comes from `buildInspectionFilter()` in `utils/inspectionFilter.js`, which is pure and meant
to be shared with anything else that lists a user's inspections (the CSV export).

- `q` matches truck numbers, trailer numbers **or remarks** that *contain* it, ignoring case,
  through `$indexOfCP` inside a `mongoose.trusted()` `$expr` (sanitizeFilter refuses an untrusted
  `$expr`). There's no regex built from input, per the standards. The term is wrapped in
  `$literal`, or a search like `$remarks` would be read as a field path and compare against that
  field. Remarks saved between June 2025 and January 2026 hold HTML entities (`Driver&#x27;s`), so
  a search containing an apostrophe or quote misses those; the stored data was left alone.
- `from`/`to` are `YYYY-MM-DD` days in the **driver's** time zone. main.js fills the form's hidden
  `tz` with `getTimezoneOffset()` (Hawaii is 600), and `localDayStart()` turns days into UTC
  instants, so a 9 PM inspection in Hawaii counts as that day. A missing `tz` means UTC. The offset
  is today's, so a range crossing a DST change can be off by an hour at its edges.
- `status=defects` is `conditionSatisfactory: { $ne: true }`, so old inspections without the field
  count as defects, matching the "Defects noted" badge.
- The stats at the top cover all of the user's inspections; only the history follows the filters.
  A page past the end shows the last page, and `prevUrl`/`nextUrl` keep the filters.

### CSV export (`GET /dashboard/export`)

The dashboard's "Download … as CSV" link (`exportUrl`, which keeps the filters; main.js adds the
browser's `tz` on load) runs `exportCsv` in `controllers/dashboard.js`. It reads the same validated
query as the dashboard, so the file holds exactly the inspections the history shows, newest first.

- `utils/inspectionCsv.js` is pure: `DEFECT_LABELS` (the checklist's 48 labels, read from
  `utils/dvirChecklist.js` in the paper form's order), `CSV_COLUMNS` (12), `csvCell()`,
  `inspectionRow()`, `localDateTime()` and `exportFileName()`.
- Every cell is quoted with inner quotes doubled, and lines end in CRLF. The file starts with a
  UTF-8 byte order mark, or Excel garbles accents and "–".
- `csvCell()` decodes the 2025 HTML entities with `decodeHTMLEntities` from `public/js/utils.js`, and
  prefixes `'` to a cell starting with `= + - @`, a tab or a CR, so a spreadsheet can't run it as a
  formula (CSV injection).
- Rows stream from a `.lean().cursor()`. The loop waits for `drain` (or stops on `close`) when
  `res.write()` returns false. An error before the first write goes to `next(err)`; after it,
  `res.destroy(err)` cuts the download off so a partial file can't pass for a whole one.
- The response is `Cache-Control: no-store`, and the link is a plain link (no `download`
  attribute): when `exportLimiter` redirects to the dashboard, its message shows there instead of
  being saved as a file.

### Rate limits (`middleware/rateLimiters.js`)

| Limiter | Routes | Limit | Keyed by | Response |
|---|---|---|---|---|
| `authLimiter` | POST /login, /signup | 20 / 15 min | IP | flash + redirect to the same path |
| `passwordResetLimiter` | POST /forgot, /reset/:token | 5 / hour | IP | flash + redirect |
| `counterLimiter` | POST /inspections/count | 30 / 15 min | IP | JSON 429 |
| `inspectionSaveLimiter` | POST /inspections | 60 / 15 min | account | JSON 429 |
| `signOffLimiter` | PUT/DELETE /inspections/:id/certification, PUT /inspections/:id/acknowledgment | 30 / 15 min | account | JSON 429 |
| `photoUploadLimiter` | POST /profile/photo | 10 / hour | account | flash + redirect to /profile |
| `passwordChangeLimiter` | POST /profile/password | 10 / 15 min | account | flash + redirect to /profile |
| `exportLimiter` | GET /dashboard/export | 20 / 15 min | account | flash + redirect to /dashboard |

The per-account limiters must run after `ensureAuth`/`ensureAuthApi`, which guarantee `req.user`.
`photoUploadLimiter` runs before multer, so a blocked upload never writes a temp file. A route
with no GET page of its own passes `flashAndRedirect(message, redirectTo)` its destination.

### Logout is POST, and reset tokens stay out of logs and analytics

- `POST /logout` comes from a small form in `views/partials/header.ejs`. There is deliberately no
  GET route, because another site could sign users out by linking to it. `.site-header__logoutBtn`
  resets the button so it looks exactly like the menu links.
- `injectGA()` in `public/js/main.js` loads Analytics with `allow_google_signals: false` and
  `allow_ad_personalization_signals: false`. The privacy policy promises no advertising, and this
  keeps that true whatever the Google Analytics admin is set to. `privacy.test.js` checks both.
- A reset token is in the reset page's URL. `injectGA()` in `public/js/main.js` returns early on
  `/reset/` paths, and morgan's `url` token in `server.js` logs every URL through `redactUrl()`
  (`utils/logUrl.js`), which shows `/reset/:token`. Keep both in step if the reset URL ever changes
  shape. `redactUrl()` also logs any `q` search value as `q=***`, because a search can quote a
  driver's remarks.

### Inspection flow — the PDF is built entirely client-side

`public/js/main.js` reads the modal form, sanitizes it, and generates the DVIR PDF with **jsPDF
loaded from cdnjs** (`views/partials/footer.ejs`), not the npm package. The script tag pins
4.2.1 with an `integrity` hash: **changing the version means changing the hash too** (cdnjs
publishes it, `https://api.cdnjs.com/libraries/jspdf/<version>?fields=sri`), or the browser
refuses the file and no PDF can be made. Then:

- **Guest**: PDF only, then `POST /inspections/count` to bump the global counter.
- **Authenticated**: same PDF, plus `POST /inspections`; the counter only increments after a
  successful save so failures don't inflate it.

Details that are easy to break:

- `runInspection()` builds the PDF **before** closing the modal. If jsPDF or the template image fails,
  the form keeps the driver's answers and `showModalFlash()` explains. Closing the modal resets it.
- The signed-in save is awaited by `saveInspection()`, which never throws. The result popup's
  `#saveStatus` (`role="status"`, only rendered for signed-in users) reports the outcome through
  `showSaveStatus()`. After a successful save on the dashboard, closing the popup reloads the page.
- `whileBusy()` disables a Generate button while it works, so a double click can't save twice.
- `returnFocus()` moves focus back to `modalOpener` (the clicked button, not `document.activeElement`:
  Safari doesn't focus buttons on click) **before** a dialog gets `aria-hidden`.
- Remarks are written one line per ruled line of the template, at the heights in `REMARK_RULES`
  (measured from `dvir-template.png`; re-measure if the image changes). More than six lines put five
  on the form, a "continue on page 2" note on the sixth, and the rest on a "Remarks (continued)" page.
- Downloads are named by `pdfFileName()`, e.g. `pretriq-TRK-100-2026-10-11.pdf`.

### Signature pads (driver and mechanic)

The modal has two optional pads (`.inspection-sig-pad`, `data-field` naming the inspection field).
The acknowledgment line (the next driver, after repairs) has none on the form: the next driver signs
the printed copy, or a saved report through the dashboard's sign-off dialog (below). main.js only
registers `#inspectionForm .inspection-sig-pad` as the form's pads, so the dialog's stay separate.
The mechanic's pad sits in the repair section, which stays hidden until a defect is ticked (below).

- `createSignaturePad()` in main.js draws with pointer events (finger, stylus and mouse). The canvas
  has `touch-action: none` in style.css, or a finger scrolls the dialog instead of signing. Pads are
  sized when the modal opens and cleared when it closes. A hidden canvas has no size, so the
  mechanic's pad is sized by `updateRepairSection()` when its section first shows.
- `toDataUrl()` crops to the ink and exports a PNG of at most 600×150 (shrinking if needed), which
  `runInspection()` adds to the inspection as `driverSignature` / `mechanicSignature`.
- `generateDVIRPDF()` stamps them at `SIGNATURE_BOXES` (measured from `dvir-template.png`), with
  heights that stop about 1.5 mm under the printed line above. It calls `setPage(1)` first, because
  long remarks leave jsPDF on page 2. Only values passing `isSignatureImage()` are drawn; old records
  hold plain text in those fields, and a PNG that won't decode is skipped with a console error.
- Signed-in saves store the data URL. `signatureField` in validators.js accepts only a PNG data URL
  of up to `SIGNATURE_MAX_LENGTH` (60,000 characters, shared from `public/js/utils.js`), with valid
  base64 that decodes to the PNG file signature. The schema has the same `maxLength`, and
  `express.json` allows 200kb so two full-size signatures fit. Guests' signatures never leave the
  browser. The CSV export leaves signatures out.

### Repair sign-offs on saved reports

A saved report that lists defects can take two sign-offs later: the mechanic's certification
(49 CFR 396.11(a)(3)) and then the next driver's acknowledgment (396.13).

**On the dashboard:**

- `getDashboard` loads each row's defects and sign-off fields (never the signatures) and adds its
  `signOff` status. The row's badge follows it: "Defects noted", then "Repairs certified", then
  "Acknowledged".
- Rows that are `open` or `certified` get a **Sign off repairs** button. With three buttons, the
  action cell wraps them where the table is narrow, instead of scrolling Delete out of view. On
  phones, Sign off repairs gets its own row. `.historyTable__td--action .btn` gives all three one
  size, because Delete is a full-size `.btn` and the other two are `.btn--nav`.
- The button opens `partials/signOffDialog.ejs`. The script for it is in main.js (search
  `signOffDialog`). It shows the report read-only from `GET /inspections/:id`, then the mechanic's
  step (the form's two boxes, a pad, a date), then the next driver's (a pad and a date). Dates
  start as today's.
- Each step saves with `fetch()`, so a server error shows in the dialog's `role="alert"` line and
  the drawn signature stays.
- "Clear and redo" deletes the mechanic's part until the next driver signs. Signing the next
  driver's part asks for confirmation first, because it makes the report final.
- Closing the dialog after any change reloads the page, so the row catches up.
- `generateDVIRPDF()` stamps `nextDriverSignature` on the form's last line (`SIGNATURE_BOXES`), so
  re-downloads carry every sign-off.

**The server side**, all JSON for a `fetch()`, guarded by `ensureAuthApi` and `signOffLimiter`:

- `PUT /inspections/:id/certification` (`validateCertification`): `outcome` is `corrected` or
  `notNeeded` (the form's two boxes, `defectsCorrected` / `defectsNotCorrected`), with a required
  `mechanicSignature` (a PNG, checked like the form's pads) and `mechanicDate`. Saving again replaces
  it.
- `DELETE /inspections/:id/certification` clears the mechanic's part, so a mistake can be redone.
- `PUT /inspections/:id/acknowledgment` (`validateAcknowledgment`): a required `nextDriverSignature`
  and `driverDate`. It makes the report final: after it, every sign-off route answers 409.

How it holds together:

- `signOffStatus()` (`utils/signOff.js`) says where a report stands: `none` (no defects), `open`,
  `certified` or `acknowledged`. A box ticked on the form when the report was saved counts as
  certified.
- Steps out of order answer 409 with a sentence the dialog can show. A report that isn't this
  account's answers 404, like a malformed id.
- Only the sign-off fields change. The driver's own part (date, truck, defects, remarks, condition,
  signature) stays as it was saved, because the rule has the company certify *on* the report.
- Each update filters on `acknowledgedAt: null`, so a report that became final in the meantime
  is left alone. `repairCertifiedAt` and `acknowledgedAt` exist only for that and for the status.
  The PDF shows the dates the signers write, never these timestamps (Bobby's call).
- `~/projects/.scratchpad/HipsterTowingCo/smoke/signOffCheck.sh` walks every step against the
  smoke stack's real MongoDB.

### Form help and the repair section

- **Help notes.** A `?` button (`.inspection-help-toggle`, with `aria-expanded` and
  `aria-controls`) beside a label opens the short note (`.inspection-help`, which starts `hidden`)
  under it. One click listener on the form calls `setHelpOpen()` in main.js, and `closeModal()`
  folds every note away again with `closeAllHelp()`. `test/unit/views/inspectionModal.test.js`
  renders the partial and checks that every button points at its own note, so add new ones in the
  same shape. The notes' text lives in `inspectionModal.ejs` for now. The truck number note's first
  sentence is Bobby's wording; keep it as written.
- **Repair section.** `#repairSection` holds the two "defects corrected" boxes, the mechanic's pad
  and date, and the next driver's acknowledgment line with its date. All of it only applies to a
  report that lists defects (49 CFR 396.11(a)(3), 396.13).
  - `updateRepairSection()` shows it when `hasDefects()` (utils.js) finds a ticked defect, and
    shows `#repairNote` in its place otherwise. It runs when the modal opens and on every change
    to a `defects[...]` checkbox.
  - `runInspection()` passes the inspection through `withoutRepairFields()`, so anything filled in
    there before the last defect was unticked stays off the PDF and out of the save. Re-downloads
    draw saved inspections as they were stored.
- **Shown and hidden with the `hidden` attribute.** `.inspection-help`, `.inspection-note` and
  `.inspection-repair` have no `display` rule in style.css, because one would override `hidden`.
  Keep it that way. normalize.css's `[hidden] { display: none; }` beats element rules such as
  `img`, but not a class that sets `display` (`.btn`, `.modal-flash`): an element like that needs
  its own `[hidden]` rule (`.modal-flash[hidden]`, `.signOff__redo[hidden]`).

### The checklist and its notes (`utils/dvirChecklist.js`)

The 48 checklist items live only in `utils/dvirChecklist.js`, keyed like the schema in
`models/Inspection.js`.
- **How it's read.** Each section lists the paper form's three columns, top to bottom.
  - `items(section)` reads them column by column. That's the schema's and the PDF template's
    order, which the CSV export uses through `labelsFor()`.
  - `formOrder(section)` reads them row by row, the order the form's grid needs to show the same
    columns.
  - `test/unit/utils/dvirChecklist.test.js` pins the keys to the schema, and the labels and the
    grid order to their old hand-written values.
- **How the form uses it.** server.js puts the module on `app.locals.dvirChecklist`, so every
  render that includes the inspection form has it. Tests that render those templates directly must
  pass it themselves, as `test/unit/views/inspectionModal.test.js` does.
  `views/partials/checklistSection.ejs` builds a section's checkboxes, and gives each item that
  has a `note` a `?` (`.inspection-check__help`, a different class from the help buttons above).
- **Note fields.** `applies`, `where`, `check` (each line is something that should be true),
  `more`, `remark`, `source`, and `photos`: one to three `{ src, width, height, alt, caption }`.
- **Cards.** `checklistNote.ejs` renders each note as a `<dialog class="inspection-card">`.
  `openChecklistNote()` in main.js shows it with `showModal()`. What the note says (photos, where,
  checks, example remark, source) is in `checklistNoteBody.ejs`, which the pre-trip guide shares.
  - The card closes with its Close button, with Escape, or with a click whose target is the
    `<dialog>` itself (the dimmed area: the dialog has no padding of its own).
  - The form's Escape handler skips while a card is open (`checklistNoteOpen()`). Otherwise one
    Escape would close the form and wipe it.
  - A long card scrolls inside the dialog, and its title and Close stay pinned at the top
    (`position: sticky`). It always opens scrolled to the top.
- **What has notes so far.** Every truck box except Air Compressor, Air Lines, Brake Accessories
  and Fifth Wheel: 30 notes in all. They were written from the CDL manual (sections 2 and 11, in
  our own words; the base is Oregon's online manual) and 49 CFR. The missing four and all the
  trailer boxes wait for a reviewer with a Class A license. Someone with a CDL reviews every note's
  wording before it ships.
- **Photos.** Bobby's photos of a real box truck live in `public/imgs/notes/`. 13 notes have them,
  17 files in all. The dash photo appears twice: in Oil Pressure for the gauges, and in Lights for
  the blue high-beam light. Bobby edited two photos by hand: the dash, and the rear view (door and
  surroundings covered). Keep those versions.
  - **Format:** lossy WebP with no metadata, 960px wide (600px for one of a portrait pair).
  - **Layout:** two portrait photos sit side by side; anything else stacks.
  - **Loading:** they're `loading="lazy"` inside closed dialogs, so a photo downloads only when its
    card opens.
  - **Privacy:** before a photo goes into the public repo, crop or blur the plate and the
    employer's name, phone number and website, unless Bobby says otherwise. Strip all metadata.
  - **Tests:** `dvirChecklist.test.js` reads each file's WebP header. It checks that the file
    exists, that its size matches the note's `width`/`height` (which go on the `<img>`), that it
    carries no EXIF or XMP chunk, and that the folder holds no unused files.
- **The 11 required items.** `REQUIRED_ITEMS` lists the parts and accessories 49 CFR
  396.11(a)(1) says every report must cover, in the rule's words and order, with the boxes that
  cover each one. The DVIR guide shows it as a table, and the tests check every key against the
  form.
- **The seven-step inspection.** `INSPECTION_STEPS` says which truck boxes are checked at each
  step of the CDL manual's seven-step inspection, in the order the step reaches them. The pre-trip
  guide shows each box's note under its step. A test fails if a truck box with a note is missing
  from it, or listed twice, so a new note needs a step.
- **Adding a checklist item.** Change the schema, its column in `dvirChecklist.js`, and the
  `xMark()` coordinates for its box in `generateDVIRPDF()`.

### The learn pages (`/learn`)

Public guides for drivers, with no login needed, all from `controllers/learn.js`:
- `GET /learn` (`views/learn/index.ejs`): the list of guides.
- `GET /learn/pre-trip` (`views/learn/pre-trip.ejs`): "How to do a pre-trip inspection".
- `GET /learn/dvir` (`views/learn/dvir.ejs`): "How to fill out a DVIR".

- **Layout.** The guides reuse the legal pages' `legalDoc` classes (sidebar contents, summary,
  sections). The extras are the `learn__` classes in style.css. `legalDoc__tocList--plain` drops the
  contents list's numbers, because the guides' steps carry their own. The sidebar is hidden below
  960px, so the pre-trip guide also lists its steps in the page.
- **The pre-trip guide's steps** are the CDL manual's seven (section 2), in our own words.
  `partials/learnBoxes.ejs` folds the notes for each step's boxes (`INSPECTION_STEPS`) into
  `<details>`. Their photos stay `loading="lazy"`, so they only download once a note is opened.
- **"How one box-truck driver does it"** in the pre-trip guide is Bobby's own routine, word for word,
  apart from two typos he had fixed (see `learn.test.js`). Change it only when Bobby says so. Anything the manual or the
  rules add goes in a `learn__routineNote` under the step.
- **Per-page title and description.** `head.ejs` takes optional `pageTitle`, `pageDescription` and
  `pagePath` locals, passed in the page's `include()`. They set the title, description, Open Graph
  and Twitter tags, and a canonical link. A page that passes none gets the home page's head, byte
  for byte.
- **Ways in.** A Learn link in the header (marked on every page under `/learn`), a Learn column in
  the footer, a link from the checklist's `?` help that opens the DVIR guide in a new tab (so the
  form keeps its answers), and links between the two guides.
- **The sample report** (`public/imgs/learn/dvir-sample.webp`) is the app's own
  `generateDVIRPDF()` output, made in headless Chromium with made-up data (Unit 12, two defects) and
  a drawn, made-up signature. It was rendered at 130 dpi, and the green markers (`--color-marker`)
  were drawn with Pillow. Markers 1 to 7 match the guide's `learn__marker` numbers. If the steps,
  the PDF template or `generateDVIRPDF()`'s layout change, remake the image.
- **Content rules.** Quotes from 49 CFR are word for word and were checked against the rule text on
  each guide's "Last reviewed" date. The CDL manual is paraphrased, never copied. The guides don't
  call pretriq "FMCSA compliant". Each section names its source, each page ends with sources and a
  not-legal-advice line, and Bobby approves the wording. Air brakes and trailers aren't covered
  until someone with a Class A license reviews that content.
- **Search engines.** `public/robots.txt` keeps crawlers out of the signed-in pages and points at
  `public/sitemap.xml`. Add every new public page to the sitemap: `learn.test.js` fails if a
  `/learn` route is missing from it.

### The privacy policy and its notice

The policy text in `views/privacy.ejs` is Bobby's, generated with Termly. Publish it word for word
and never edit its wording; flag problems to Bobby instead.

- **`utils/privacyPolicy.js`** holds `UPDATED`, the Hawaii date the current policy took effect, and
  `ANNOUNCE`, whether account holders must be told about it.
  - The page's "Last updated" date reads `UPDATED` through `app.locals.privacyPolicy`, so the page
    and the notice can't disagree.
  - A material change sets both. A typo fix moves `UPDATED` but keeps `ANNOUNCE` false.
- **Who sees the notice.** `needsPrivacyNotice(user)` decides, and viewLocals turns it into
  `showPrivacyNotice`. It's true for an account that:
  - was created before `UPDATED` (or has no `createdAt`)
  - has a name, because an account still in onboarding can't dismiss it: `ensureAuth` would send
    its "Got it" back to `/onboard`
  - hasn't pressed "Got it" for this version
- **The notice** (`partials/privacyNotice.ejs`) sits under the header bar on every page.
  - "Got it" is a plain form post to `POST /privacy/notice` (`ensureAuth`, then
    `validatePrivacyNotice`, then `postNoticeSeen`), so it works without JavaScript.
  - The controller saves the policy's version (`UPDATED`) on the account as `privacyPolicySeen`.
    It's a version rather than a time, so a dismissal sticks even if the site goes live before
    the policy's date.
  - It then returns to the page it came from through `safeReturnPath()`, which only allows a path
    on this site: anything else, such as `//host` or `/\host`, goes to `/dashboard`.
- **Email.** Users who rarely log in hear about a change by email. Bobby sends it from pretriq's
  Gmail with every address in BCC; the app has no bulk mailer.

The `Counter` model holds a single global document (`name: 'inspectionCount'`) powering the public
homepage count — it is not per-user.

### `public/js/utils.js` is loaded twice, two different ways

`utils.js` holds `FIELD_LIMITS`, `sanitizeText`, `validateAndSanitize`, `decodeHTMLEntities`,
`pdfFileName`, `isSignatureImage`, and `hasDefects` / `withoutRepairFields` (the repair section's
rule). The browser loads it as a plain script from `views/partials/footer.ejs`, **deferred and
before `main.js`**, so the functions are globals by the time `main.js`'s handlers call them. Jest
`require()`s the same file. The `module.exports` at the bottom is wrapped in a
`typeof module !== 'undefined'` guard so the browser doesn't throw on it — **keep that guard**.

These functions must stay **pure** — no DOM access — or they stop being testable and stop working
under `require()`. Their tests run in Jest's plain node environment (there is no jsdom). DOM
feedback belongs in `main.js`; `flagMissingTruckNumber()` is the pattern to follow. That separation
exists because the functions were previously duplicated in `main.js`, the copies drifted, and the
tested version was not the shipped one.

- `sanitizeText` only trims. It used to strip quotes, apostrophes, backticks, angle brackets and
  backslashes, which mangled "Driver's side". jsPDF draws plain text and EJS escapes on output,
  so keep characters as typed.
- `validateAndSanitize` cuts each field to `FIELD_LIMITS`, the same numbers as `validateInspection`.
- `decodeHTMLEntities` exists for inspections saved between June 2025 and January 2026, when an old
  route stored text through `escape()` (`Driver&#x27;s`). It decodes entities only and leaves
  tag-like text alone; never decode with `innerHTML` or `DOMParser`, which drop `<brake lines>`.

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
with the controller's payload over reasoning about it. `dvirChecklist` and `privacyPolicy` are the
exceptions: they come from `app.locals` (server.js), so controllers don't pass them.

### CSP: no inline scripts or handlers, and a hash that can go stale

`scriptSrc` has **no `'unsafe-inline'`**, and `scriptSrcAttr` is absent so it defaults to `'none'`.
That means **an inline `onclick`/`onsubmit` will silently not fire** — use `addEventListener` in
`public/js/main.js` instead. `.profileCard__deleteForm` is the pattern to copy.

`styleSrc` has no `'unsafe-inline'` either, so **a `style="..."` attribute or `<style>` block is
silently ignored**; put styles in `public/css/style.css`. Setting `element.style.x` from JS is
still allowed. The only outside hosts left are Google Analytics/Tag Manager, Google Fonts, cdnjs
(jsPDF) and Cloudinary images. The footer's social icons are inline SVG (Font Awesome Free
paths, license comment kept in `footer.ejs`), not the Font Awesome kit, and a profile without a
photo shows `/imgs/avatarPlaceholder.svg`. Any XML comment in an SVG file must not contain `--`,
or the browser can't parse the image.

The one inline `<script>` is the JSON-LD block in `head.ejs`, allowed by a SHA-256 hash in
`server.js`. **Editing that block — even its whitespace — invalidates the hash and silently blocks
the structured data.** `test/unit/views/learn.test.js` fails when the two drift apart. Regenerate
with:

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
- **`engines: { node: "24.22.1" }` in `package.json` is load-bearing — do not remove it.** Railway
  reads it to pick a Node version. It's an exact version, the Oct 21 2026 security release: the
  service's builder must be Railpack (a setting in Railway's dashboard), because Nixpacks only
  honours the major version. Bump it for each Node security release, never back to a range
  (`test/unit/config/server.test.js` fails on one); the startup log line prints the running
  version, so Railway's deploy log confirms it. `mongodb`/`mongoose` require `>=20.19.0` and call the
  global `crypto.getRandomValues`, which does not exist on Node 18. Without the pin, Railway
  defaulted to Node 18 and production crash-looped on `ReferenceError: crypto is not defined`.
  nodemailer 10 also needs Node 20 or newer.
- Dependency updates: take versions at least a week old, and run `npm audit fix` only after
  checking its lockfile diff (in this repo it once tried to rewrite thousands of unrelated lines;
  `npm update <package>` fixed the one vulnerable package instead). Never `npm audit fix --force`:
  it would downgrade jest and reinstall old tooling. The remaining audit findings are 19 moderate
  ones inside Jest, dev-only, with no fix released yet.
- A push to `main` is a production deploy. The `pretriq` Railway service owns `pretriq.com`.
  A second service, `permissible-wool`, used to build from this same repo with no domain and its
  own database. Bobby deleted it on Oct 21 2026, after Railway's environment-variable breach.