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

  it('should link to both guides', () => {
    expect(html).toContain('<a href="/learn/pre-trip">How to do a pre-trip inspection</a>');
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

describe('learn/pre-trip.ejs', () => {

  // Bobby's routine as Bobby wrote it (Oct 12 2026). The page keeps it word for word,
  // and anything the manual or the rules add goes in a note under the step.
  const ROUTINE = [
    'Wipe both driver & passenger side mirrors with microfiber cloth & ammonia-free glass cleaner spray',
    'Kick all 4 tires to check for air pressure (daily) & check tire tread (using a US coin). Visually inspect for punctures. When kicking the tires, my boot should bounce off the rubber. If my boot sinks into the tire, it must be filled up with air. For the tire tread, I believe the saying is: "Use a penny and if the tire tread covers Lincoln\'s hat, then you\'re okay"',
    'I tighten the gas cap',
    'I look underneath the vehicle for fractures in the metal/frame. Debris that are wrapped underneath. Check safety tag expiration (might be Hawaii only)',
    'Inspect doors/floor. I open driver/passenger door and remove and debri/obstruction on the steps of the door or floor',
    'Check lights - left+right signal/blinker front & back, left+right hazard front & back, high beams, automatic/manual on/off light switch',
    'Use windshield wiper/fluid to increase visibility on front windshield',
    'Step on the brakes and observe brake lights through side mirrors (vehicle off)',
    'Tap horn once or twice',
    'Open hood',
    'Check all fluid levels - windshield wiper, brake fluid(/transmission fluid?), oil level/consistency/color, power steering fluid, check battery terminal for corrosion, check belt for cracks/damage',
    'Close hood',
    'Hop inside vehicle inspect seatbelt',
    'Turn vehicle on',
    'Fully turn steering wheel to the left and listen for groans',
    'Fully turn steering wheel to the right and listen for groans',
    'Tap on brakes to feel for response',
    'Turn vehicle off',
  ];

  let html;

  beforeAll(async () => {
    html = await render('learn/pre-trip.ejs', { currentPath: '/learn/pre-trip' });
  });

  const section = (id) => html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];

  it('should set its own title, description and canonical URL', () => {
    expect(html).toContain('<title>How to Do a Pre-Trip Inspection - Pretriq</title>');
    expect(html).toMatch(/<meta name="description" content="The CDL manual&#39;s seven-step pre-trip inspection[^"]+">/);
    expect(html).toContain('<link rel="canonical" href="https://pretriq.com/learn/pre-trip">');
  });

  it('should point every contents and step link at a section with a heading', () => {
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const targets = [...main.matchAll(/<a href="#([\w-]+)"/g)].map((match) => match[1]);

    expect(new Set(targets)).toEqual(new Set(['rules', 'missed', 'steps', 'routine', 'defects', 'sources', 'step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6', 'step-7']));
    new Set(targets).forEach((id) => {
      expect(html).toContain(`<section id="${id}" class="legalDoc__section" aria-labelledby="${id}-heading">`);
      expect(html).toContain(`<h2 id="${id}-heading"`);
    });
  });

  it('should number the seven steps in order', () => {
    const markers = [...html.matchAll(/<span class="learn__marker">(\d+)<\/span>/g)].map((match) => Number(match[1]));

    expect(markers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  // Each box's note appears once, under the step where it's checked
  it('should fold each box\'s note under its step, in the order the step reaches it', () => {
    const labels = dvirChecklist.labelsFor('truckTractor');

    Object.entries(dvirChecklist.INSPECTION_STEPS).forEach(([step, keys]) => {
      const summaries = [...section(`step-${step}`).matchAll(/<summary class="learn__boxSummary">([^<]+)<\/summary>/g)].map((match) => match[1]);
      expect(summaries).toEqual(keys.map((key) => labels[key]));
    });
    expect(html.match(/<details class="learn__box">/g)).toHaveLength(30);
    [1, 4, 6].forEach((step) => expect(section(`step-${step}`)).not.toContain('<details'));
  });

  it('should show the notes as the form does, photos included', () => {
    const tires = section('step-5').match(/<details class="learn__box">\s*<summary class="learn__boxSummary">Tires<\/summary>[\s\S]*?<\/details>/)[0];

    expect(tires).toContain('Where it is:');
    expect(tires).toContain('<img class="inspection-card__photo" src="/imgs/notes/tire-penny.webp"');
    expect(tires).toContain('loading="lazy"');
  });

  it("should keep the driver's routine word for word, with notes under steps 2, 4, 11, 16 and 17", () => {
    const steps = [...section('routine').match(/<ol class="learn__routineSteps">([\s\S]*?)<\/ol>/)[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
    const words = steps.map((step) => step.match(/<p>([^<]*)<\/p>/)[1].replace(/&amp;/g, '&'));
    const withNotes = steps.map((step, index) => (step.includes('learn__routineNote') ? index + 1 : null)).filter(Boolean);

    expect(words).toEqual(ROUTINE);
    expect(withNotes).toEqual([2, 4, 11, 16, 17]);
  });

  it('should give a review date, its sources, and say it is not legal advice', () => {
    expect(html).toMatch(/Last reviewed <time datetime="\d{4}-\d{2}-\d{2}">/);
    ['392.7', '396.7', '396.13', '396.17'].forEach((rule) => {
      expect(html).toContain(`<a href="https://www.ecfr.gov/current/title-49/section-${rule}">`);
    });
    expect(html).toContain('https://www.oregon.gov/odot/DMV/Pages/Online_CDL_Manual_2/Section_2.aspx');
    expect(html).toContain("It isn't legal advice");
  });

});

describe('the ways to the guides', () => {

  it('should list the guides in the footer', async () => {
    const html = await render('partials/footer.ejs');

    expect(html).toContain('<h2 class="site-footer__title">Learn</h2>');
    expect(html).toContain('<a href="/learn">All guides</a>');
    expect(html).toContain('<a href="/learn/pre-trip">How to do a pre-trip</a>');
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
