const fs = require('fs');
const path = require('path');
const { CHECKLIST, REQUIRED_ITEMS, INSPECTION_STEPS, items, formOrder, labelsFor } = require('../../../utils/dvirChecklist');
const Inspection = require('../../../models/Inspection');
const readWebp = require('../helpers/readWebp');

// The labels exactly as the form and the CSV export showed them before they
// moved into utils/dvirChecklist.js, in the paper form's order
const LABELS = {
  truckTractor: {
    airCompressor: 'Air Compressor', airLines: 'Air Lines', battery: 'Battery', brakeAccessories: 'Brake Accessories',
    brakes: 'Brakes', carburetor: 'Carburetor', clutch: 'Clutch', defroster: 'Defroster', driveLine: 'Drive Line',
    engine: 'Engine', fifthWheel: 'Fifth Wheel', frontAxle: 'Front Axle', fuelTanks: 'Fuel Tanks', heater: 'Heater',
    horn: 'Horn', lights: 'Lights', mirrors: 'Mirrors', muffler: 'Muffler', oilPressure: 'Oil Pressure',
    onBoardRecorder: 'On-Board Recorder', radiator: 'Radiator', rearEnd: 'Rear End', reflectors: 'Reflectors',
    safetyEquipment: 'Safety Equipment', springs: 'Springs', starter: 'Starter', steering: 'Steering',
    tachograph: 'Tachograph', tires: 'Tires', transmission: 'Transmission', wheels: 'Wheels', windows: 'Windows',
    windshieldWipers: 'Windshield Wipers', other: 'Other',
  },
  trailer: {
    brakeConnections: 'Brake Connections', brakes: 'Brakes', couplingChains: 'Coupling Chains',
    couplingPin: 'Coupling (King) Pin', doors: 'Doors', hitch: 'Hitch', landingGear: 'Landing Gear',
    lightsAll: 'Lights – All', roof: 'Roof', springs: 'Springs', tarpaulin: 'Tarpaulin', tires: 'Tires',
    wheels: 'Wheels', other: 'Other',
  },
};

// The order the form's grid showed the checkboxes in, when they were typed out
// by hand in inspectionModal.ejs: the paper form's three columns, row by row
const FORM_ORDER = {
  truckTractor: [
    'airCompressor', 'horn', 'springs', 'airLines', 'lights', 'starter', 'battery', 'mirrors', 'steering',
    'brakeAccessories', 'muffler', 'tachograph', 'brakes', 'oilPressure', 'tires', 'carburetor', 'onBoardRecorder',
    'transmission', 'clutch', 'radiator', 'wheels', 'defroster', 'rearEnd', 'windows', 'driveLine', 'reflectors',
    'windshieldWipers', 'engine', 'safetyEquipment', 'other', 'fifthWheel', 'frontAxle', 'fuelTanks', 'heater',
  ],
  trailer: [
    'brakeConnections', 'hitch', 'tarpaulin', 'brakes', 'landingGear', 'tires', 'couplingChains', 'lightsAll',
    'wheels', 'couplingPin', 'roof', 'other', 'doors', 'springs',
  ],
};

// Every truck box has a note except the air-brake ones and Fifth Wheel, which
// wait (with the trailer boxes) for a reviewer with a Class A license
const WITHOUT_NOTES = ['airCompressor', 'airLines', 'brakeAccessories', 'fifthWheel'];
const WITH_NOTES = FORM_ORDER.truckTractor.filter((key) => !WITHOUT_NOTES.includes(key));

const NOTE_FIELDS = ['applies', 'where', 'check', 'more', 'remark', 'source', 'photos'];

describe('dvirChecklist', () => {

  describe.each(['truckTractor', 'trailer'])('%s', (section) => {

    // The schema decides which items exist, so the two can't drift apart
    it('should list every item in the schema, once, in the schema\'s order', () => {
      const schemaKeys = Object.keys(Inspection.schema.path(`defects.${section}`).schema.obj);
      expect(items(section).map((item) => item.key)).toEqual(schemaKeys);
    });

    it('should keep the labels the form and the CSV export have always used', () => {
      expect(labelsFor(section)).toEqual(LABELS[section]);
      expect(Object.keys(labelsFor(section))).toEqual(Object.keys(LABELS[section]));
    });

    it('should lay the grid out in the same order as the hand-written form did', () => {
      expect(formOrder(section).map((item) => item.key)).toEqual(FORM_ORDER[section]);
    });

  });

  describe('notes', () => {

    const withNotes = (section) => items(section).filter((item) => item.note);

    it('should cover every truck box but the air-brake ones and Fifth Wheel, and no trailer box yet', () => {
      expect(withNotes('truckTractor').map((item) => item.key).sort()).toEqual([...WITH_NOTES].sort());
      expect(WITH_NOTES).toHaveLength(30);
      expect(withNotes('trailer')).toEqual([]);
    });

    it.each(WITH_NOTES)('should give %s a well-formed note', (key) => {
      const { note } = items('truckTractor').find((item) => item.key === key);

      Object.keys(note).forEach((field) => expect(NOTE_FIELDS).toContain(field));
      expect(note.check.length).toBeGreaterThan(0);
      note.check.forEach((line) => expect(line).toMatch(/^\S.*[.:]$/));
      // A note says where the part is, or who it's for when most trucks don't have it
      expect(note.where || note.applies).toBeTruthy();
      ['applies', 'where', 'more', 'remark', 'source'].forEach((field) => {
        if (note[field] !== undefined) {
          expect(typeof note[field]).toBe('string');
          expect(note[field].trim()).toBe(note[field]);
        }
      });
    });

    // The width and height go on the <img>, so a wrong pair would squash it
    it('should give each photo a real file of the size it says, with no metadata, plus alt text and a caption', () => {
      const photos = items('truckTractor').concat(items('trailer')).flatMap((item) => (item.note && item.note.photos) || []);

      expect(photos.length).toBeGreaterThan(0);
      photos.forEach((photo) => {
        expect(photo.src).toMatch(/^\/imgs\/notes\/[a-z0-9-]+\.webp$/);
        const file = readWebp(path.join(__dirname, '../../../public', photo.src));
        expect({ src: photo.src, width: file.width, height: file.height }).toEqual({ src: photo.src, width: photo.width, height: photo.height });
        // EXIF and XMP chunks could carry where and when a photo was taken
        expect(file.chunks).toEqual(['VP8 ']);
        expect(photo.alt.trim().length).toBeGreaterThan(0);
        expect(photo.caption).toMatch(/^\S.*\.$/);
      });
    });

    it('should give a note one to three photos, and no photo file without a note', () => {
      const notes = items('truckTractor').filter((item) => item.note && item.note.photos).map((item) => item.note);
      const used = notes.flatMap((note) => note.photos.map((photo) => path.basename(photo.src)));

      notes.forEach((note) => expect([1, 2, 3]).toContain(note.photos.length));
      expect(fs.readdirSync(path.join(__dirname, '../../../public/imgs/notes')).sort()).toEqual([...new Set(used)].sort());
    });

  });

  // 49 CFR 396.11(a)(1)(i)-(xi), word for word
  describe('REQUIRED_ITEMS', () => {

    it('should list the 11 items the rule names, in its order', () => {
      expect(REQUIRED_ITEMS.map((item) => item.rule)).toEqual([
        'Service brakes including trailer brake connections', 'Parking brake', 'Steering mechanism',
        'Lighting devices and reflectors', 'Tires', 'Horn', 'Windshield wipers', 'Rear vision mirrors',
        'Coupling devices', 'Wheels and rims', 'Emergency equipment',
      ]);
    });

    it('should point every item at boxes that exist on the form', () => {
      REQUIRED_ITEMS.forEach((item) => {
        expect(item.truckTractor.length).toBeGreaterThan(0);
        ['truckTractor', 'trailer'].forEach((section) => {
          (item[section] || []).forEach((key) => expect(Object.keys(labelsFor(section))).toContain(key));
        });
      });
    });

  });

  // The pre-trip guide shows each note under its step, so a new note needs a step
  describe('INSPECTION_STEPS', () => {

    it('should place every truck box with a note in exactly one step, and nothing else', () => {
      const placed = Object.values(INSPECTION_STEPS).flat();

      expect([...placed].sort()).toEqual([...WITH_NOTES].sort());
      expect(new Set(placed).size).toBe(placed.length);
    });

    it("should only use the manual's step numbers", () => {
      Object.keys(INSPECTION_STEPS).forEach((step) => expect(['1', '2', '3', '4', '5', '6', '7']).toContain(step));
    });

  });

  it('should not let a caller change the checklist through items()', () => {
    const list = items('trailer');
    list.pop();
    expect(items('trailer')).toHaveLength(14);
    expect(CHECKLIST.trailer.flat()).toHaveLength(14);
  });

});
