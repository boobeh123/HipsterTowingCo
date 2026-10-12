const mongoose = require('mongoose');
const { localDayStart, buildInspectionFilter } = require('../../../utils/inspectionFilter');

// mongoose.trusted() adds a hidden symbol that toEqual() would see, so
// compare plain JSON copies (dates become ISO strings)
const plain = (value) => JSON.parse(JSON.stringify(value));

describe('localDayStart()', () => {
  // tz is Date.getTimezoneOffset(): minutes to add to local time to get UTC
  it('should give the UTC moment a local day starts', () => {
    expect(localDayStart('2026-10-10', 0).toISOString()).toBe('2026-10-10T00:00:00.000Z');
    expect(localDayStart('2026-10-10', 600).toISOString()).toBe('2026-10-10T10:00:00.000Z');   // Hawaii
    expect(localDayStart('2026-10-10', -540).toISOString()).toBe('2026-10-09T15:00:00.000Z');  // Japan
  });

  it('should treat a missing time zone as UTC', () => {
    expect(localDayStart('2026-10-10').toISOString()).toBe('2026-10-10T00:00:00.000Z');
  });
});

describe('buildInspectionFilter()', () => {
  const userId = 'user123';

  it('should only scope to the user when no filters are set', () => {
    expect(buildInspectionFilter(userId, {})).toEqual({ userId });
    expect(buildInspectionFilter(userId)).toEqual({ userId });
  });

  it('should match truck or trailer numbers containing the text, ignoring case', () => {
    const filter = buildInspectionFilter(userId, { q: 'TrK' });

    expect(filter.userId).toBe(userId);
    expect(plain(filter.$expr)).toEqual({
      $or: [
        { $gte: [{ $indexOfCP: [{ $toLower: '$truckTractorNo' }, { $literal: 'trk' }] }, 0] },
        { $gte: [{ $indexOfCP: [{ $toLower: '$trailerNo' }, { $literal: 'trk' }] }, 0] },
      ],
    });
  });

  // A term starting with "$" would otherwise be read as another field's value
  it('should pass the search text as a literal, never as a field path', () => {
    const filter = buildInspectionFilter(userId, { q: '$remarks' });

    expect(JSON.stringify(filter.$expr)).toContain('{"$literal":"$remarks"}');
  });

  // sanitizeFilter (config/database.js) refuses $expr unless it is trusted
  it('should mark its operators trusted so sanitizeFilter keeps them', () => {
    const filter = buildInspectionFilter(userId, { q: 'trk', from: '2026-10-01', status: 'defects' });

    const sanitized = mongoose.sanitizeFilter({ ...filter });
    expect(sanitized.$expr).toBe(filter.$expr);
    expect(sanitized.createdAt).not.toHaveProperty('$eq');
    expect(plain(sanitized.conditionSatisfactory)).toEqual({ $ne: true });
    // The same $expr without the trusted mark is refused
    expect(() => mongoose.sanitizeFilter({ $expr: JSON.parse(JSON.stringify(filter.$expr)) })).toThrow('$expr is not allowed');
  });

  it('should cover whole local days, From through To, in the browser time zone', () => {
    const filter = buildInspectionFilter(userId, { from: '2026-10-10', to: '2026-10-10', tz: 600 });

    expect(filter.createdAt.$gte.toISOString()).toBe('2026-10-10T10:00:00.000Z');
    expect(filter.createdAt.$lt.toISOString()).toBe('2026-10-11T10:00:00.000Z');
  });

  it('should swap From and To when they are the wrong way round', () => {
    const filter = buildInspectionFilter(userId, { from: '2026-10-12', to: '2026-10-01' });

    expect(filter.createdAt.$gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(filter.createdAt.$lt.toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });

  it('should allow only a From or only a To', () => {
    expect(plain(buildInspectionFilter(userId, { from: '2026-10-01' }).createdAt)).toEqual({ $gte: '2026-10-01T00:00:00.000Z' });
    expect(plain(buildInspectionFilter(userId, { to: '2026-10-01' }).createdAt)).toEqual({ $lt: '2026-10-02T00:00:00.000Z' });
  });

  // Old inspections saved before conditionSatisfactory existed show "Defects noted"
  it('should map the condition filter, counting a missing flag as defects', () => {
    expect(buildInspectionFilter(userId, { status: 'ok' }).conditionSatisfactory).toBe(true);
    expect(plain(buildInspectionFilter(userId, { status: 'defects' }).conditionSatisfactory)).toEqual({ $ne: true });
  });
});
