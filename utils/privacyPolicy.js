/**************************************************************
 * privacyPolicy.js
 * When the privacy policy last changed, and who still needs to be
 * told about it. views/privacy.ejs shows the date (app.locals in
 * server.js), and middleware/viewLocals.js shows
 * partials/privacyNotice.ejs to the signed-in users who need it.
 *
 * To publish a new policy, set UPDATED to the day it takes effect
 * (a Hawaii date), and set ANNOUNCE to true when users must hear
 * about it. Every account created before that day then sees the
 * notice until it presses "Got it" (POST /privacy/notice), which
 * saves this UPDATED on the account as privacyPolicySeen. A typo
 * fix keeps ANNOUNCE false.
 **************************************************************/
const UPDATED = '2026-10-26'
const ANNOUNCE = true

// Midnight in Hawaii (no daylight saving) on the day the policy took effect
const updatedAt = new Date(`${UPDATED}T00:00:00-10:00`)

// "October 26, 2026", for the page and the notice
const updatedLabel = updatedAt.toLocaleDateString('en-US', { timeZone: 'Pacific/Honolulu', year: 'numeric', month: 'long', day: 'numeric' })

// True for a signed-in account that hasn't heard about the latest change: one
// created before it (or old enough to have no createdAt) that hasn't pressed
// "Got it" for this version. Versions are YYYY-MM-DD strings, so they compare
// in order as text. An account still in onboarding waits until it has a name,
// because ensureAuth would send its "Got it" back to /onboard unsaved.
// Tests pass their own policy.
const needsPrivacyNotice = (user, policy = { announce: ANNOUNCE, updated: UPDATED, updatedAt }) => {
    if (!user || !user.name || !policy.announce) {
        return false
    }
    const joinedBefore = !user.createdAt || user.createdAt < policy.updatedAt
    const seenThisVersion = typeof user.privacyPolicySeen === 'string' && user.privacyPolicySeen >= policy.updated
    return joinedBefore && !seenThisVersion
}

// Where "Got it" goes back to: a path on this site, and nothing else. Another
// site, "//host" or "/\host" (which browsers read as another site), and any
// whitespace send the user to the dashboard instead.
const safeReturnPath = (value) => {
    const isLocalPath = typeof value === 'string' && value.length <= 200 && /^\/(?![/\\])[^\s\\]*$/.test(value)
    return isLocalPath ? value : '/dashboard'
}

module.exports = { UPDATED, ANNOUNCE, updatedAt, updatedLabel, needsPrivacyNotice, safeReturnPath }
