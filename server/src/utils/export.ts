import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportCR {
  crNumber: string;
  title: string;
  projectName: string;
  clientName: string | null;
  status: string;
  priority: string;
  changeType: string;
  dateOfRequest: Date | null;
  estimatedHours: number;
  hourlyRate: number;
  totalCost: number;
  currency: string;
  version: number;
  submittedBy: string;
  approvedAt: Date | null;
  approvalNotes: string | null;
  recommendation: string | null;
}

interface ExportFilters {
  projectId?: string;
  clientName?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

const esc = (v: unknown): string => {
  const s = String(v ?? '').replace(/"/g, '""');
  return `"${s}"`;
};

export const generateCSV = (crs: ExportCR[]): string => {
  const headers = [
    'CR Number',
    'Project',
    'Client',
    'Status',
    'Priority',
    'Change Type',
    'Date Submitted',
    'Estimated Hours',
    'Hourly Rate',
    'Total Cost',
    'Currency',
    'Version',
    'Submitted By',
    'Approved Date',
    'Approval Notes',
    'DM Recommendation',
  ];

  const rows = crs.map((cr) =>
    [
      esc(cr.crNumber),
      esc(cr.projectName),
      esc(cr.clientName),
      esc(cr.status),
      esc(cr.priority),
      esc(cr.changeType),
      esc(cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : ''),
      esc(cr.estimatedHours),
      esc(cr.hourlyRate),
      esc(cr.totalCost),
      esc(cr.currency),
      esc(`v${cr.version}`),
      esc(cr.submittedBy),
      esc(cr.approvedAt ? new Date(cr.approvedAt).toLocaleDateString() : ''),
      esc(cr.approvalNotes),
      esc(cr.recommendation),
    ].join(','),
  );

  return [headers.map(esc).join(','), ...rows].join('\r\n');
};

// ─── PDF export ───────────────────────────────────────────────────────────────

const BRAND_RED = '#EF323F';
const DARK = '#2D2D2D';
const GREY = '#5D5B5B';
const LIGHT = '#F7F7F7';

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    n,
  );

export const generateListPDF = (crs: ExportCR[], filters: ExportFilters): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
    });
    doc.pipe(stream);
    stream.on('finish', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 70).fill(BRAND_RED);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('DotZero CR Portal', 50, 22);
    doc.fontSize(11).font('Helvetica').text('Change Requests Export Report', 50, 46);

    doc.fillColor(DARK).moveDown(2);

    // ── Filter summary ──
    doc.fontSize(9).fillColor(GREY);
    const filterParts: string[] = [`Export date: ${new Date().toLocaleDateString()}`];
    if (filters.dateFrom) filterParts.push(`From: ${filters.dateFrom}`);
    if (filters.dateTo) filterParts.push(`To: ${filters.dateTo}`);
    if (filters.status) filterParts.push(`Status: ${filters.status}`);
    if (filters.clientName) filterParts.push(`Client: ${filters.clientName}`);
    doc.text(filterParts.join('  ·  '), 50, 90);

    doc.moveDown(1.5);

    // ── Table header ──
    const cols = [
      { label: 'CR #', w: 80 },
      { label: 'Project', w: 100 },
      { label: 'Status', w: 70 },
      { label: 'Hours', w: 45 },
      { label: 'Cost', w: 80 },
      { label: 'Date', w: 70 },
    ];
    const tableLeft = 50;
    let y = doc.y;

    // Header row
    doc.rect(tableLeft, y, doc.page.width - 100, 18).fill(DARK);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    let x = tableLeft + 4;
    cols.forEach((col) => {
      doc.text(col.label, x, y + 5, { width: col.w - 4 });
      x += col.w;
    });

    y += 20;

    // Data rows
    doc.font('Helvetica').fontSize(8);
    crs.forEach((cr, i) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }
      const bg = i % 2 === 0 ? 'white' : LIGHT;
      doc.rect(tableLeft, y, doc.page.width - 100, 16).fill(bg);
      doc.fillColor(DARK);
      x = tableLeft + 4;
      const cells = [
        cr.crNumber,
        cr.projectName,
        cr.status,
        `${cr.estimatedHours}h`,
        fmt(cr.totalCost, cr.currency),
        cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—',
      ];
      cols.forEach((col, ci) => {
        doc.text(String(cells[ci] ?? ''), x, y + 4, { width: col.w - 4, ellipsis: true });
        x += col.w;
      });
      y += 17;
    });

    // ── Totals ──
    y += 10;
    const byCurrency = crs.reduce(
      (acc, cr) => {
        const c = cr.currency;
        if (!acc[c]) acc[c] = { hours: 0, cost: 0, count: 0 };
        acc[c].hours += cr.estimatedHours;
        acc[c].cost += cr.totalCost;
        acc[c].count += 1;
        return acc;
      },
      {} as Record<string, { hours: number; cost: number; count: number }>,
    );

    doc.rect(tableLeft, y, doc.page.width - 100, 18).fill(BRAND_RED);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTALS', tableLeft + 4, y + 5, { width: 150 });
    Object.entries(byCurrency).forEach(([cur, t], i) => {
      doc.text(
        `${cur}: ${t.count} CRs · ${t.hours}h · ${fmt(t.cost, cur)}`,
        tableLeft + 160 + i * 160,
        y + 5,
        { width: 155 },
      );
    });

    doc.end();
  });
};
