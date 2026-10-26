const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const privacyPolicy = require('../../../utils/privacyPolicy');

// The privacy page and the notice about its latest change, rendered from the
// real views with the locals the app gives them: user, currentPath and
// showPrivacyNotice from middleware/viewLocals.js, privacyPolicy from
// app.locals in server.js.
const VIEWS = path.join(__dirname, '../../../views');
const render = (view, locals = {}) => ejs.renderFile(path.join(VIEWS, view), { user: null, currentPath: '/', privacyPolicy, ...locals });

describe('privacy.ejs', () => {

  let html;

  beforeAll(async () => {
    html = await render('privacy.ejs', { currentPath: '/privacy' });
  });

  it("should show the date from utils/privacyPolicy.js, so the page and the notice agree", () => {
    expect(html).toContain(`Last updated <time datetime="${privacyPolicy.UPDATED}">${privacyPolicy.updatedLabel}</time>`);
  });

  // The notice's "See what changed" links to /privacy#changes
  it('should say what changed in this update, where the notice links to', () => {
    expect(html).toContain('<section id="changes" class="legalDoc__changes" aria-labelledby="changes-heading">');
    expect(html).toContain(`<h2 id="changes-heading" class="legalDoc__changesTitle">What changed on ${privacyPolicy.updatedLabel}</h2>`);
  });

  it('should set its own title and canonical URL', () => {
    expect(html).toContain('<title>Privacy Policy - Pretriq</title>');
    expect(html).toContain('<link rel="canonical" href="https://pretriq.com/privacy">');
  });

  it('should point every in-page link at a section with a heading', () => {
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const targets = new Set([...main.matchAll(/<a href="#([\w-]+)"/g)].map((match) => match[1]));

    expect(targets.size).toBe(15);
    targets.forEach((id) => {
      expect(html).toContain(`<section id="${id}" class="legalDoc__section" aria-labelledby="${id}-heading">`);
      expect(html).toContain(`<h2 id="${id}-heading"`);
    });
  });

  it('should list the categories of personal information A to L', () => {
    const rows = [...html.matchAll(/<th scope="row">([A-L])\. /g)].map((match) => match[1]);

    expect(rows).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
  });

  // Fixes Bobby asked for on Oct 25 2026, against claims that weren't true of pretriq
  it('should give one contact address and leave out what pretriq doesn\'t do', () => {
    const emails = new Set([...html.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((match) => match[0]));

    expect(emails).toEqual(new Set(['boobeh321@gmail.com']));
    ['PayPal', 'Cookie Notice', 'display advertisements', 'written contract'].forEach((claim) => {
      expect(html).not.toContain(claim);
    });
  });

});

describe('the privacy notice in header.ejs', () => {

  const user = { name: 'Driver', email: 'driver@example.com' };

  it('should show the update date, a link to what changed, and a "Got it" form back to this page', async () => {
    const html = await render('partials/header.ejs', { user, currentPath: '/learn/dvir', showPrivacyNotice: true });
    const notice = html.match(/<div class="privacyNotice" role="region" aria-label="Privacy policy update">[\s\S]*?<\/form>/)[0];

    expect(notice).toContain(`<time datetime="${privacyPolicy.UPDATED}">${privacyPolicy.updatedLabel}</time>`);
    expect(notice).toContain('<a href="/privacy#changes">See what changed</a>');
    expect(notice).toContain('<form action="/privacy/notice" method="POST" class="privacyNotice__form">');
    expect(notice).toContain('<input type="hidden" name="returnTo" value="/learn/dvir" />');
    expect(notice).toContain('<button type="submit" class="btn btn--nav">Got it</button>');
  });

  it('should come after the header bar, not inside it', async () => {
    const html = await render('partials/header.ejs', { user, currentPath: '/dashboard', showPrivacyNotice: true });

    expect(html.indexOf('class="privacyNotice"')).toBeGreaterThan(html.indexOf('</header>'));
  });

  it('should stay out of the page when the user doesn\'t need it, and for guests', async () => {
    const signedIn = await render('partials/header.ejs', { user, currentPath: '/dashboard', showPrivacyNotice: false });
    const guest = await render('partials/header.ejs', { currentPath: '/' });

    expect(signedIn).not.toContain('privacyNotice');
    expect(guest).not.toContain('privacyNotice');
  });

  it('should escape the path it sends back', async () => {
    const html = await render('partials/header.ejs', { user, currentPath: '/a"><script>', showPrivacyNotice: true });

    expect(html).toContain('value="/a&#34;&gt;&lt;script&gt;"');
    expect(html).not.toContain('"><script>');
  });

});

// The policy's promise of no advertising, kept in the code that loads Analytics
describe('Google Analytics', () => {

  it('should load with Google signals and ad personalization turned off', () => {
    const main = fs.readFileSync(path.join(__dirname, '../../../public/js/main.js'), 'utf8');
    const config = main.match(/gtag\('config', 'G-[A-Z0-9]+', \{([^}]*)\}\)/);

    expect(config).not.toBeNull();
    expect(config[1]).toMatch(/allow_google_signals: false/);
    expect(config[1]).toMatch(/allow_ad_personalization_signals: false/);
  });

});
