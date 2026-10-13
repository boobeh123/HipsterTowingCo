const path = require('path');
const ejs = require('ejs');

// The inspection modal, rendered from the real partial. Its ? buttons open
// their help notes by id (setHelpOpen() in public/js/main.js), so a typo in
// aria-controls would leave a button that does nothing.
const VIEW = path.join(__dirname, '../../../views/partials/inspectionModal.ejs');

const renderModal = (user) => ejs.renderFile(VIEW, { user, inspectionCount: 0 });

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

  it('should render the same help for a signed-in user', async () => {
    const signedIn = await renderModal({ _id: 'user-1', name: 'Driver' });

    expect(signedIn.match(/class="inspection-help-toggle"/g)).toHaveLength(html.match(/class="inspection-help-toggle"/g).length);
    expect(signedIn).toContain('id="saveInspectionBtn"');
  });

});
