const { DEFECT_LABELS, CSV_COLUMNS, CSV_HEADER, csvCell, csvRow, localDateTime, inspectionRow, exportFileName } = require('../../../utils/inspectionCsv');

// Splits one CSV line back into cells (enough for these tests: no embedded line breaks)
const cells = (line) => line.replace(/\r\n$/, '').slice(1, -1).split('","').map((cell) => cell.split('""').join('"'));

describe('csvCell()', () => {
  it('should quote every cell and double the quotes inside it', () => {
    expect(csvCell('TRK-100')).toBe('"TRK-100"');
    expect(csvCell('5\'6" clearance, low')).toBe('"5\'6"" clearance, low"');
  });

  it('should keep line breaks inside the quoted cell', () => {
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('should turn missing values into empty cells', () => {
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(null)).toBe('""');
  });

  // Opened in a spreadsheet, these would run as formulas (CSV injection)
  it.each(['=', '+', '-', '@', '\t', '\r'])('should neutralise a cell starting with %j', (start) => {
    expect(csvCell(`${start}HYPERLINK("http://example.com")`)).toBe(`"'${start}HYPERLINK(""http://example.com"")"`);
  });

  it('should decode the HTML entities of inspections saved in 2025', () => {
    expect(csvCell('Driver&#x27;s side &lt;check&gt;')).toBe('"Driver\'s side <check>"');
  });
});

describe('csvRow() and CSV_HEADER', () => {
  it('should join cells with commas and end with CRLF', () => {
    expect(csvRow(['a', 'b'])).toBe('"a","b"\r\n');
  });

  it('should list the 12 columns in order', () => {
    expect(CSV_COLUMNS).toHaveLength(12);
    expect(cells(CSV_HEADER)).toEqual(CSV_COLUMNS);
  });
});

describe('localDateTime() and exportFileName()', () => {
  const savedAt = new Date('2026-10-11T07:00:00Z');

  it('should show the date and time in the driver\'s time zone', () => {
    expect(localDateTime(savedAt, 600)).toBe('2026-10-10 21:00');   // Hawaii
    expect(localDateTime(savedAt, 0)).toBe('2026-10-11 07:00');     // UTC
    expect(localDateTime(savedAt)).toBe('2026-10-11 07:00');
  });

  it('should give an empty string for a missing or invalid date', () => {
    expect(localDateTime(undefined)).toBe('');
    expect(localDateTime(new Date('nope'))).toBe('');
  });

  it('should name the file after the driver\'s calendar day', () => {
    expect(exportFileName(600, savedAt)).toBe('pretriq-inspections-2026-10-10.csv');
    expect(exportFileName(0, savedAt)).toBe('pretriq-inspections-2026-10-11.csv');
  });
});

describe('inspectionRow()', () => {
  const inspection = {
    createdAt: new Date('2026-10-11T07:00:00Z'),
    date: '10/10/2026',
    truckTractorNo: 'TRK-100',
    trailerNo: 'TRL-9',
    conditionSatisfactory: false,
    defects: {
      truckTractor: { brakes: true, mirrors: true, horn: false, onBoardRecorder: true },
      trailer: { lightsAll: true, couplingPin: true },
    },
    remarks: 'Left mirror cracked',
    defectsCorrected: true,
    defectsNotCorrected: false,
    mechanicDate: '10/11/2026',
    driverDate: '',
  };

  it('should fill the 12 columns in order, using the checklist\'s labels', () => {
    expect(cells(inspectionRow(inspection, 600))).toEqual([
      '2026-10-10 21:00',
      '10/10/2026',
      'TRK-100',
      'TRL-9',
      'Defects noted',
      'Brakes; Mirrors; On-Board Recorder',
      'Coupling (King) Pin; Lights – All',
      'Left mirror cracked',
      'Yes',
      '',
      '10/11/2026',
      '',
    ]);
  });

  it('should show Satisfactory and empty defect lists for a clean inspection', () => {
    const row = cells(inspectionRow({ truckTractorNo: 'TRK-1', conditionSatisfactory: true }, 0));

    expect(row[4]).toBe('Satisfactory');
    expect(row[5]).toBe('');
    expect(row[6]).toBe('');
    expect(row).toHaveLength(12);
  });

  // Old inspections saved before conditionSatisfactory existed, as on the dashboard
  it('should count a missing condition flag as defects noted', () => {
    expect(cells(inspectionRow({ truckTractorNo: 'OLD-1' }, 0))[4]).toBe('Defects noted');
  });

  it('should have a label for every checklist item', () => {
    expect(Object.keys(DEFECT_LABELS.truckTractor)).toHaveLength(34);
    expect(Object.keys(DEFECT_LABELS.trailer)).toHaveLength(14);
  });
});
