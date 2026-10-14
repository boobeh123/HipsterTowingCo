const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ejs = require('ejs');
const dvirChecklist = require('../../../utils/dvirChecklist');
const readWebp = require('../helpers/readWebp');

// The learn pages and the partials that lead to them, rendered from the real
// views with the locals the app gives every view: user and currentPath from
// middleware/viewLocals.js, dvirChecklist from app.locals in server.js.
const ROOT = path.join(__dirname, '../../..');
const render = (view, locals = {}) => ejs.renderFile(path.join(ROOT, 'views', view), { user: null, currentPath: '/', dvirChecklist, ...locals });

describe('head.ejs', () => {

  it("should keep the home page's title and URL, and no canonical link, when a page passes none", async () => {
    const html = await render('partials/head.ejs');

    expect(html).toContain('<title>Pretriq - Submit FMCSA Pre-Trip Inspection Checklists Digitally</title>');
    expect(html).toContain('<meta property="og:url"         content="https://pretriq.com/">');
    expect(html).not.toContain('rel="canonical"');
  });

  it("should use a page's own title, description and URL, escaped", async () => {
    const html = await render('partials/head.ejs', { pageTitle: 'Tires & Wheels', pageDescription: 'What "worn" means', pagePath: '/learn/tires' });

    expect(html).toContain('<title>Tires &amp; Wheels</title>');
    expect(html).toContain('<meta name="description" content="What &#34;worn&#34; means">');
    expect(html).toContain('<link rel="canonical" href="https://pretriq.com/learn/tires">');
    expect(html).toContain('<meta property="og:url"         content="https://pretriq.com/learn/tires">');
    expect(html).toContain('<meta property="twitter:title"       content="Tires &amp; Wheels">');
  });

  // server.js lists the JSON-LD block's hash in the CSP, so the two have to change together
  it('should leave the JSON-LD block matching its hash in the CSP', async () => {
    const html = await render('partials/head.ejs', { pageTitle: 'A guide', pagePath: '/learn/dvir' });
    const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    const hash = crypto.createHash('sha256').update(block).digest('base64');

    expect(fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8')).toContain(`'sha256-${hash}'`);
  });

});

describe('header.ejs Learn link', () => {

  // Marked on every page under /learn, but only /learn itself is the current page
  it.each([
    ['/', false, false],
    ['/learn', true, true],
    ['/learn/dvir', true, false],
    ['/learning', false, false],
  ])('on %s: marked %s, current page %s', async (currentPath, marked, current) => {
    const html = await render('partials/header.ejs', { currentPath });
    const link = html.match(/<a\s+href="\/learn"[^>]*>Learn<\/a>/)[0];

    expect(link.includes('site-header__navLink--active')).toBe(marked);
    expect(link).toContain(`aria-current="${current ? 'page' : 'false'}"`);
  });

  it('should show Learn beside the user menu when signed in', async () => {
    const html = await render('partials/header.ejs', { user: { name: 'Driver', email: 'driver@example.com' }, currentPath: '/dashboard' });

    expect(html).toContain('>Learn</a>');
    expect(html).toContain('id="userNavToggle"');
  });

});

describe('learn/index.ejs', () => {

  let html;

  beforeAll(async () => {
    html = await render('learn/index.ejs', { currentPath: '/learn' });
  });

  it('should set its own title and canonical URL', () => {
    expect(html).toContain('<title>Guides for Drivers - Pretriq</title>');
    expect(html).toContain('<link rel="canonical" href="https://pretriq.com/learn">');
  });

  it('should link to the DVIR guide', () => {
    expect(html).toContain('<a href="/learn/dvir">How to fill out a DVIR</a>');
  });

});

describe('learn/dvir.ejs', () => {

  let html;

  beforeAll(async () => {
    html = await render('learn/dvir.ejs', { currentPath: '/learn/dvir' });
  });

  it('should set its own title, description and canonical URL', () => {
    expect(html).toContain('<title>How to Fill Out a DVIR - Pretriq</title>');
    expect(html).toMatch(/<meta name="description" content="A step-by-step guide[^"]+">/);
    expect(html).toContain('<link rel="canonical" href="https://pretriq.com/learn/dvir">');
  });

  it('should point every table-of-contents link at a section with a heading', () => {
    const targets = [...html.matchAll(/<a href="#([\w-]+)" class="legalDoc__tocLink">/g)].map((match) => match[1]);

    expect(targets).toHaveLength(7);
    targets.forEach((id) => {
      expect(html).toContain(`<section id="${id}" class="legalDoc__section" aria-labelledby="${id}-heading">`);
      expect(html).toContain(`<h2 id="${id}-heading"`);
    });
  });

  // The sample image is marked 1 to 7, and the steps are numbered to match
  it('should number its steps 1 to 7, in order', () => {
    const markers = [...html.matchAll(/<span class="learn__marker">(\d+)<\/span>/g)].map((match) => Number(match[1]));

    expect(markers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('should show the sample report at its real size, with alt text, a full-size link and no metadata', () => {
    const [, src, alt, width, height] = html.match(/<img src="(\/imgs\/learn\/[\w-]+\.webp)" alt="([^"]+)" width="(\d+)" height="(\d+)"/);
    const file = readWebp(path.join(ROOT, 'public', src));

    expect([file.width, file.height]).toEqual([Number(width), Number(height)]);
    expect(file.chunks).toEqual(['VP8 ']);
    expect(alt).toMatch(/^A sample report .+\.$/);
    expect(html).toContain(`<a href="${src}" class="learn__figureLink">`);
  });

  it("should list the rule's 11 items with the form's own box labels", () => {
    const rows = [...html.matchAll(/<th scope="row">([^<]+)<\/th>/g)].map((match) => match[1]);

    expect(rows).toEqual(dvirChecklist.REQUIRED_ITEMS.map((item) => item.rule));
    expect(html).toContain('Trailer: Coupling (King) Pin, Coupling Chains, Hitch');
    expect(html).toContain('Trailer: Lights – All');
  });

  it('should give a review date, its sources, and say it is not legal advice', () => {
    expect(html).toMatch(/Last reviewed <time datetime="\d{4}-\d{2}-\d{2}">/);
    ['396.11', '396.13', '390.32'].forEach((section) => {
      expect(html).toContain(`<a href="https://www.ecfr.gov/current/title-49/section-${section}">`);
    });
    expect(html).toContain('https://www.federalregister.gov/documents/2026/02/19/2026-03264/');
    expect(html).toContain("It isn't legal advice");
  });

});

describe('the ways to the guides', () => {

  it('should list the guides in the footer', async () => {
    const html = await render('partials/footer.ejs');

    expect(html).toContain('<h2 class="site-footer__title">Learn</h2>');
    expect(html).toContain('<a href="/learn">All guides</a>');
    expect(html).toContain('<a href="/learn/dvir">How to fill out a DVIR</a>');
  });

  it('should put every /learn route in the sitemap', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'routes/main.js'), 'utf8');
    const sitemap = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
    const learnPaths = [...routes.matchAll(/router\.get\('(\/learn[^']*)'/g)].map((match) => match[1]);

    expect(learnPaths.length).toBeGreaterThanOrEqual(2);
    learnPaths.forEach((learnPath) => expect(sitemap).toContain(`<loc>https://pretriq.com${learnPath}</loc>`));
  });

  it('should point robots.txt at the sitemap and keep crawlers out of signed-in pages', () => {
    const robots = fs.readFileSync(path.join(ROOT, 'public/robots.txt'), 'utf8');

    expect(robots).toContain('Sitemap: https://pretriq.com/sitemap.xml');
    ['/dashboard', '/profile', '/onboard'].forEach((page) => expect(robots).toContain(`Disallow: ${page}\n`));
    expect(robots).not.toMatch(/Disallow: \/learn|Disallow: \/\n/);
  });

});
