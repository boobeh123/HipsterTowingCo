const path = require('path');
const ejs = require('ejs');
const dvirChecklist = require('../../../utils/dvirChecklist');

// The inspection modal, rendered from the real partial. Its ? buttons open
// their help notes by id (setHelpOpen() in public/js/main.js), so a typo in
// aria-controls would leave a button that does nothing. server.js supplies
// dvirChecklist through app.locals; these renders pass it the same way.
const VIEW = path.join(__dirname, '../../../views/partials/inspectionModal.ejs');
const NOTE_VIEW = path.join(__dirname, '../../../views/partials/checklistNote.ejs');

const renderModal = (user) => ejs.renderFile(VIEW, { user, inspectionCount: 0, dvirChecklist });

describe('inspectionModal.ejs help', () => {

  let html;

  beforeAll(async () => {
    html = await renderModal(null);
  });

  it('should point every ? button at its own help note, which starts hidden', () => {
    const targets = [...html.matchAll(/class="inspection-help-toggle"[^>]*aria-controls="([^"]+)"/g)].map((match) => match[1]);

    expect(targets.length).toBeGreaterThanOrEqual(6);
    expect(new Set(targets).size).toBe(targets.length);
    targets.forEach((id) => {
      expect(html).toContain(`<div id="${id}" class="inspection-help" hidden>`);
    });
  });

  it('should make every ? button a named, collapsed, non-submitting button', () => {
    const buttons = html.match(/<button[^>]*class="inspection-help-toggle"[^>]*>/g);

    buttons.forEach((button) => {
      expect(button).toContain('type="button"');
      expect(button).toContain('aria-expanded="false"');
      expect(button).toMatch(/aria-label="About [^"]+"/);
    });
  });

  // A USDOT number is the company's, the same on every truck it runs
  it('should ask for a unit number or license plate, not a USDOT number', () => {
    expect(html).toContain('placeholder="Unit # / License plate"');
    expect(html).not.toContain('USDOT #');
    expect(html).toContain('The rule states the report must identify the vehicle.');
  });

  // main.js shows it once a defect is ticked (updateRepairSection)
  it("should start with the mechanic's and next driver's part hidden, and a note in its place", () => {
    const section = html.match(/<div id="repairSection" class="inspection-repair" hidden>([\s\S]*?)<\/section>/);

    expect(section).not.toBeNull();
    ['name="defectsCorrected"', 'name="defectsNotCorrected"', 'data-field="mechanicSignature"', 'name="mechanicDate"', 'name="driverDate"'].forEach((field) => {
      expect(section[1]).toContain(field);
    });
    expect(section[1]).not.toContain('data-field="driverSignature"');
    expect(html).toMatch(/<p id="repairNote" class="inspection-note[^"]*">/);
  });

  it('should render the same help for a signed-in user', async () => {
    const signedIn = await renderModal({ _id: 'user-1', name: 'Driver' });

    expect(signedIn.match(/class="inspection-help-toggle"/g)).toHaveLength(html.match(/class="inspection-help-toggle"/g).length);
    expect(signedIn).toContain('id="saveInspectionBtn"');
  });

});

describe('inspectionModal.ejs checklist', () => {

  let html;

  beforeAll(async () => {
    html = await renderModal(null);
  });

  // The order is pinned to the old hand-written form in dvirChecklist.test.js
  it.each(['truckTractor', 'trailer'])('should render every %s checkbox in the form order', (section) => {
    const names = [...html.matchAll(new RegExp(`name="defects\\[${section}\\]\\[(\\w+)\\]"`, 'g'))].map((match) => match[1]);

    expect(names).toEqual(dvirChecklist.formOrder(section).map((item) => item.key));
  });

  it('should give each item with a note a ? that opens its own dialog', () => {
    const buttons = html.match(/<button[^>]*class="inspection-check__help"[^>]*>/g);
    const withNotes = dvirChecklist.items('truckTractor').filter((item) => item.note);

    expect(buttons).toHaveLength(withNotes.length);
    buttons.forEach((button) => {
      const id = button.match(/aria-controls="([^"]+)"/)[1];
      expect(button).toContain('type="button"');
      expect(button).toContain('aria-haspopup="dialog"');
      expect(button).toMatch(/aria-label="About [^"]+"/);
      expect(html).toContain(`<dialog id="${id}" class="inspection-card" aria-labelledby="${id}-title">`);
      expect(html).toContain(`id="${id}-title"`);
    });
  });

  it('should show a note\'s parts in its card', () => {
    const brakes = dvirChecklist.items('truckTractor').find((item) => item.key === 'brakes');
    const card = html.match(/<dialog id="note-truckTractor-brakes"[\s\S]*?<\/dialog>/)[0];

    expect(card).toContain('class="inspection-card__close"');
    expect(card).toContain('Where it is:');
    expect(card.match(/<li>/g)).toHaveLength(brakes.note.check.length);
    expect(card).toContain(`“${brakes.note.remark}”`);
    expect(card).toContain(`Source: ${brakes.note.source}`);
  });

  it('should leave the items without a note as a plain checkbox', () => {
    expect(html).not.toContain('aria-controls="note-truckTractor-tires"');
    expect(html).not.toContain('id="note-trailer-');
  });

});

describe('checklistNote.ejs', () => {

  const note = { where: 'Under the hood.', check: ['It works.'] };

  // The photo slot stays out of the card until a note has a photo
  it('should show a photo only when the note has one', async () => {
    const without = await ejs.renderFile(NOTE_VIEW, { noteId: 'note-x', item: { label: 'Battery', note } });
    const withPhoto = await ejs.renderFile(NOTE_VIEW, {
      noteId: 'note-x',
      item: { label: 'Battery', note: { ...note, photo: { src: '/imgs/notes/battery.webp', alt: 'Battery under the hood', width: 800, height: 600 } } },
    });

    expect(without).not.toContain('<img');
    expect(withPhoto).toContain('<img class="inspection-card__photo" src="/imgs/notes/battery.webp" alt="Battery under the hood" width="800" height="600" loading="lazy" />');
  });

  it('should escape note text', async () => {
    const card = await ejs.renderFile(NOTE_VIEW, { noteId: 'note-x', item: { label: 'A <b>', note: { where: '<script>', check: ['"quoted"'] } } });

    expect(card).not.toContain('<script>');
    expect(card).not.toContain('<b>');
    expect(card).toContain('&lt;script&gt;');
  });

});
