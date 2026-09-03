// Deterministic sample data. No randomness: a corpus case must render the same
// bytes today and in six months, or the regression suite is worthless.

const MACHINES = [
  ['Canon imageRUNNER ADVANCE DX C3835i', 'MFP', 6480],
  ['Konica Minolta bizhub C360i', 'MFP', 5240],
  ['Ricoh IM C3000', 'MFP', 5890],
  ['Xerox AltaLink C8145', 'MFP', 9120],
  ['HP Color LaserJet E78330dn', 'MFP', 4760],
  ['Sharp BP-70C31', 'MFP', 7310],
];
const PARTS = [
  ['Inner Finisher-L1 (staple)', 'Accessory', 940],
  ['Cassette Feeding Unit AK1', 'Accessory', 615],
  ['Super G3 FAX Board', 'Accessory', 480],
  ['Paper Deck Unit UO1', 'Accessory', 1290],
  ['Staple Cartridge (3-pack)', 'Supply', 86],
  ['Card Reader / Badge Auth Kit', 'Accessory', 530],
  ['Copy Tray / Job Separator', 'Accessory', 215],
  ['Waste Toner Container', 'Supply', 48],
];
const SITES = ['Corporate — 4th Floor', 'Mill Creek Warehouse', 'Northgate Clinic',
               'Eastside Annex', 'Riverbend Depot', 'South Campus'];

/**
 * @param {number} n
 * @param {{sites?:number, longDescriptionAt?:number, longDescriptionRepeat?:number}} [o]
 *   longDescriptionRepeat controls how tall the oversized row is. A Letter page
 *   fits roughly 3,000 characters in this column width, so a value of 15 puts a
 *   single row well past a full page — the case the layout engine cannot
 *   satisfy with break-inside:avoid and must handle some other way.
 */
export function lineItems(n, o = {}) {
  const sites = o.sites ?? 3;
  const out = [];
  for (let i = 0; i < n; i++) {
    const isMachine = i % 4 === 0;
    const src = isMachine ? MACHINES[(i / 4 | 0) % MACHINES.length] : PARTS[i % PARTS.length];
    const quantity = isMachine ? 1 + (i % 2) : 1 + (i % 3);
    let name = src[0];
    if (o.longDescriptionAt === i) {
      name = src[0] + ' — ' + ('configured with hole-punch unit, saddle-stitch finisher, ' +
        'two 550-sheet cassettes, high-capacity 2000-sheet tandem tray, fax expansion, ' +
        'badge authentication reader, secure-release print firmware, IPsec network stack, ' +
        'and on-site orientation for up to twelve named operators at this location ')
        .repeat(o.longDescriptionRepeat ?? 15);
    }
    out.push({
      name, type: src[1], quantity, unit: src[2], extended: quantity * src[2],
      serial: `SN${String(480000 + i * 137).padStart(8, '0')}`,
      site: sites > 0 ? SITES[(i / Math.max(1, Math.ceil(n / sites)) | 0) % sites] : SITES[0],
    });
  }
  return out;
}

export function deal(overrides = {}) {
  return {
    company: {
      name: 'Bellevue Dental Partners',
      address: '1420 148th Ave NE, Bellevue, WA 98007',
      phone: '(425) 555-0410',
    },
    contact: { ship_to: 'Dana Okonjo', ap: 'Rae Lindqvist' },
    deal: { name: 'Fleet Refresh — 2026', quote_number: 'Q-20416', close_date: '2026-09-30' },
    rep: { name: 'Marko Ajder', phone: '(425) 555-0182', email: 'mivanovic@example.com' },
    lease: { partner: 'GreatAmerica', term: 60, rate_factor: 0.01974 },
    dealer: {
      company: 'Quantum Office Systems',
      address: '3300 Maple Valley Rd, Suite 210 · Renton, WA 98058',
      phone: '(425) 555-0100',
      website: 'quantumoffice.example',
    },
    today: '2026-09-03',
    ...overrides,
  };
}
