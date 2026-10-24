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

  it("should show the date from utils/privacyPolicy.js, so the page and the notice agree", async () => {
    const html = await render('privacy.ejs', { currentPath: '/privacy' });

    expect(html).toContain(`Last updated <time datetime="${privacyPolicy.UPDATED}">${privacyPolicy.updatedLabel}</time>`);
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
