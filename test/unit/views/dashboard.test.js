const path = require('path');
const ejs = require('ejs');
const dvirChecklist = require('../../../utils/dvirChecklist');
const privacyPolicy = require('../../../utils/privacyPolicy');

// The dashboard's history and its repair sign-off dialog, rendered from the real
// view with the locals the app gives it: the controller's payload, viewLocals'
// user, currentPath and flash types, and app.locals' dvirChecklist and privacyPolicy.
const VIEW = path.join(__dirname, '../../../views/dashboard.ejs');

const row = (id, truck, signOff, fields = {}) => ({
  _id: id, truckTractorNo: truck, trailerNo: '', date: '10/25/2026', createdAt: new Date('2026-10-25T20:00:00Z'), signOff, ...fields,
});

const render = (inspections, locals = {}) => ejs.renderFile(VIEW, {
  inspections,
  totalInspections: inspections.length,
  lastInspectionDate: '10/25/2026',
  currentPage: 1,
  totalPages: 1,
  prevUrl: null,
  nextUrl: null,
  exportUrl: '/dashboard/export',
  filters: {},
  filtersActive: false,
  filtersIgnored: false,
  matchingInspections: inspections.length,
  inspectionCount: 0,
  success: [], errors: [], error: [], info: [],
  currentPath: '/dashboard',
  user: { _id: 'user123', name: 'Jordan Rivera', email: 'driver@example.com' },
  showPrivacyNotice: false,
  dvirChecklist,
  privacyPolicy,
  ...locals,
});

describe('dashboard.ejs repair sign-offs', () => {

  let html;

  beforeAll(async () => {
    html = await render([
      row('a1', 'TRK-OK', 'none', { conditionSatisfactory: true }),
      row('b2', 'TRK-OPEN', 'open'),
      row('c3', 'TRK-CERT', 'certified'),
      row('d4', 'TRK-DONE', 'acknowledged'),
      row('e5', 'TRK-UNMARKED', 'none'),
    ]);
  });

  const rowFor = (truck) => html.match(new RegExp(`<tr class="historyTable__row">(?:(?!</tr>)[\\s\\S])*?${truck}[\\s\\S]*?</tr>`))[0];

  it.each([
    ['TRK-OK', 'Satisfactory'],
    ['TRK-OPEN', 'Defects noted'],
    ['TRK-CERT', 'Repairs certified'],
    ['TRK-DONE', 'Acknowledged'],
    ['TRK-UNMARKED', 'Defects noted'],
  ])('should badge %s as %s', (truck, badge) => {
    expect(rowFor(truck)).toMatch(new RegExp(`historyTable__badge[^"]*">${badge}</span>`));
  });

  // Only a report with defects that isn't final yet can be signed off
  it.each([
    ['TRK-OPEN', true],
    ['TRK-CERT', true],
    ['TRK-OK', false],
    ['TRK-DONE', false],
    ['TRK-UNMARKED', false],
  ])('should offer Sign off repairs on %s: %s', (truck, offered) => {
    expect(rowFor(truck).includes('historyTable__signOff')).toBe(offered);
  });

  it('should point each Sign off repairs button at its own report', () => {
    expect(rowFor('TRK-OPEN')).toMatch(/class="btn btn--nav historyTable__signOff"\s+data-id="b2"\s+aria-haspopup="dialog"\s+aria-label="Sign off repairs for truck TRK-OPEN"/);
  });

  it('should include the sign-off dialog once, with the form\'s defect names', () => {
    expect(html.match(/<dialog\s+id="signOffDialog"/g)).toHaveLength(1);
    const labels = JSON.parse(html.match(/data-labels="([^"]+)"/)[1].replace(/&#34;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"));

    expect(labels.truckTractor.brakes).toBe('Brakes');
    expect(labels.trailer.lightsAll).toBe('Lights – All');
  });

  it('should give the dialog both steps, each with its own signature pad, and an error line', () => {
    const dialog = html.match(/<dialog\s+id="signOffDialog"[\s\S]*?<\/dialog>/)[0];

    expect(dialog).toContain('data-form="certification"');
    expect(dialog).toContain('data-form="acknowledgment"');
    expect(dialog).toContain('data-signoff-pad="mechanicSignature"');
    expect(dialog).toContain('data-signoff-pad="nextDriverSignature"');
    expect(dialog).toContain('<input type="radio" name="outcome" value="corrected" />');
    expect(dialog).toContain('<input type="radio" name="outcome" value="notNeeded" />');
    expect(dialog).toContain('<p class="signOff__error" role="alert" hidden></p>');
  });

  // main.js registers #inspectionForm's pads as the form's; the dialog's stay out of that
  it("should keep the dialog's pads outside the inspection form", () => {
    const form = html.match(/<form id="inspectionForm"[\s\S]*?<\/form>/)[0];

    expect(form).not.toContain('data-signoff-pad');
  });

});

describe('dashboard.ejs empty states', () => {

  // A new account, with nothing saved yet, gets pointed at the guides
  it('should point an account with no reports at both guides', async () => {
    const html = await render([]);
    const guides = html.match(/<p class="dashboard__emptyHint dashboard__emptyGuides">[\s\S]*?<\/p>/);

    expect(html).toContain('No inspections saved yet.');
    expect(guides[0]).toContain('<a href="/learn/dvir">How to fill out a DVIR</a>');
    expect(guides[0]).toContain('<a href="/learn/pre-trip">How to do a pre-trip</a>');
  });

  it('should leave the guides out when filters match nothing', async () => {
    const html = await render([], { totalInspections: 3, filtersActive: true, filters: { q: 'TRK-NONE' } });

    expect(html).toContain('No inspections match these filters.');
    expect(html).not.toContain('dashboard__emptyGuides');
  });

});
