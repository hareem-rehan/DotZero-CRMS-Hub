import { prisma } from '../../config/db';
import { CRStatus } from '@prisma/client';
import { generateCSV, generateListPDF, ExportCR } from '../../utils/export';

// ─── Finance: CR list with cost data ─────────────────────────────────────────

export const listFinanceCRs = async (query: {
  projectId?: string;
  clientName?: string;
  status?: string;
  showAll?: boolean;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, query.pageSize ?? 25);
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (!query.showAll) {
    where.status = { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] };
  }
  if (query.status) where.status = query.status;
  if (query.projectId) where.projectId = query.projectId;
  if (query.clientName) {
    where.project = { clientName: { contains: query.clientName, mode: 'insensitive' } };
  }
  if (query.dateFrom || query.dateTo) {
    where.dateOfRequest = {};
    if (query.dateFrom) where.dateOfRequest.gte = new Date(query.dateFrom);
    if (query.dateTo) where.dateOfRequest.lte = new Date(query.dateTo);
  }

  const [crs, total] = await Promise.all([
    prisma.changeRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { dateOfRequest: 'desc' },
      include: {
        project: { select: { id: true, name: true, code: true, clientName: true, hourlyRate: true, currency: true } },
        submittedBy: { select: { id: true, name: true } },
        impactAnalysis: { select: { estimatedHours: true, recommendation: true } },
        approval: { select: { approvalNotes: true, approvedAt: true } },
      },
    }),
    prisma.changeRequest.count({ where }),
  ]);

  // Compute totalCost for each CR and cumulative totals
  const enriched = crs.map((cr) => {
    const hours = cr.impactAnalysis ? Number(cr.impactAnalysis.estimatedHours) : 0;
    const rate = Number(cr.project.hourlyRate);
    const totalCost = hours * rate;
    return { ...cr, totalCost, estimatedHours: hours, hourlyRate: rate };
  });

  // Cumulative totals grouped by currency
  const totals = enriched.reduce((acc, cr) => {
    const cur = cr.project.currency ?? 'USD';
    if (!acc[cur]) acc[cur] = { currency: cur, totalCRs: 0, totalHours: 0, totalCost: 0 };
    acc[cur].totalCRs += 1;
    acc[cur].totalHours += cr.estimatedHours;
    acc[cur].totalCost += cr.totalCost;
    return acc;
  }, {} as Record<string, { currency: string; totalCRs: number; totalHours: number; totalCost: number }>);

  return {
    crs: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: Object.values(totals),
  };
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const exportCRs = async (
  format: 'csv' | 'pdf',
  filters: { projectId?: string; clientName?: string; status?: string; showAll?: boolean; dateFrom?: string; dateTo?: string },
): Promise<{ buffer: Buffer | string; filename: string; contentType: string }> => {
  // Re-use finance list but fetch all (no pagination)
  const result = await listFinanceCRs({ ...filters, page: 1, pageSize: 500 });

  const rows: ExportCR[] = result.crs.map((cr) => ({
    crNumber: cr.crNumber,
    title: cr.title,
    projectName: cr.project.name,
    clientName: cr.project.clientName,
    status: cr.status,
    priority: cr.priority,
    changeType: cr.changeType,
    dateOfRequest: cr.dateOfRequest ? new Date(cr.dateOfRequest) : null,
    estimatedHours: cr.estimatedHours,
    hourlyRate: cr.hourlyRate,
    totalCost: cr.totalCost,
    currency: cr.project.currency ?? 'USD',
    version: (cr as unknown as { version: number }).version ?? 1,
    submittedBy: cr.submittedBy.name,
    approvedAt: cr.approval?.approvedAt ? new Date(cr.approval.approvedAt) : null,
    approvalNotes: cr.approval?.approvalNotes ?? null,
    recommendation: cr.impactAnalysis?.recommendation ?? null,
  }));

  const dateTag = new Date().toISOString().slice(0, 10);
  const filterTag = [filters.status, filters.clientName].filter(Boolean).join('_') || 'all';

  if (format === 'csv') {
    return {
      buffer: generateCSV(rows),
      filename: `dotzero_crs_${dateTag}_${filterTag}.csv`,
      contentType: 'text/csv',
    };
  }

  const buffer = await generateListPDF(rows, filters);
  return {
    buffer,
    filename: `dotzero_crs_${dateTag}_${filterTag}.pdf`,
    contentType: 'application/pdf',
  };
};

// ─── Finance: CR detail with full cost breakdown ──────────────────────────────

export const getFinanceCRById = async (id: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, code: true, clientName: true, hourlyRate: true, currency: true } },
      submittedBy: { select: { id: true, name: true, email: true } },
      attachments: true,
      impactAnalysis: true,
      approval: true,
      versions: { orderBy: { versionNumber: 'asc' }, include: { createdBy: { select: { id: true, name: true } } } },
      statusHistory: { orderBy: { changedAt: 'asc' }, include: { changedBy: { select: { id: true, name: true } } } },
    },
  });
  if (!cr) return null;

  const hours = cr.impactAnalysis ? Number(cr.impactAnalysis.estimatedHours) : 0;
  const rate = Number(cr.project.hourlyRate);
  return { ...cr, totalCost: hours * rate, estimatedHours: hours, hourlyRate: rate };
};

// ─── Finance Dashboard: Monthly summary ──────────────────────────────────────

export const getFinanceDashboard = async (dateFrom?: string, dateTo?: string) => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const rangeStart = dateFrom ? new Date(dateFrom) : thisMonthStart;
  const rangeEnd = dateTo ? new Date(dateTo) : now;

  const approvedStatuses = { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] as CRStatus[] };

  const [thisPeriodCRs, lastMonthCRs, projectBreakdown] = await Promise.all([
    prisma.changeRequest.findMany({
      where: { status: approvedStatuses, dateOfRequest: { gte: rangeStart, lte: rangeEnd } },
      include: { project: { select: { hourlyRate: true, currency: true, name: true, code: true } }, impactAnalysis: { select: { estimatedHours: true } } },
    }),
    prisma.changeRequest.findMany({
      where: { status: approvedStatuses, dateOfRequest: { gte: lastMonthStart, lte: lastMonthEnd } },
      include: { project: { select: { name: true, code: true, hourlyRate: true, currency: true } }, impactAnalysis: { select: { estimatedHours: true } } },
    }),
    prisma.changeRequest.findMany({
      where: { status: approvedStatuses, dateOfRequest: { gte: rangeStart, lte: rangeEnd } },
      include: { project: { select: { id: true, name: true, code: true, clientName: true, hourlyRate: true, currency: true } }, impactAnalysis: { select: { estimatedHours: true } } },
    }),
  ]);

  const summarize = (crs: typeof thisPeriodCRs) =>
    crs.reduce((acc, cr) => {
      const cur = cr.project.currency ?? 'USD';
      if (!acc[cur]) acc[cur] = { currency: cur, count: 0, hours: 0, cost: 0 };
      const hours = cr.impactAnalysis ? Number(cr.impactAnalysis.estimatedHours) : 0;
      acc[cur].count += 1;
      acc[cur].hours += hours;
      acc[cur].cost += hours * Number(cr.project.hourlyRate);
      return acc;
    }, {} as Record<string, { currency: string; count: number; hours: number; cost: number }>);

  const thisPeriodSummary = summarize(thisPeriodCRs);
  const lastMonthSummary = summarize(lastMonthCRs);

  // Per-project breakdown
  const byProject = projectBreakdown.reduce((acc, cr) => {
    const key = cr.project.id;
    if (!acc[key]) acc[key] = { projectId: key, projectName: cr.project.name, projectCode: cr.project.code, clientName: cr.project.clientName, currency: cr.project.currency ?? 'USD', count: 0, hours: 0, cost: 0 };
    const hours = cr.impactAnalysis ? Number(cr.impactAnalysis.estimatedHours) : 0;
    acc[key].count += 1;
    acc[key].hours += hours;
    acc[key].cost += hours * Number(cr.project.hourlyRate);
    return acc;
  }, {} as Record<string, { projectId: string; projectName: string; projectCode: string; clientName: string | null; currency: string; count: number; hours: number; cost: number }>);

  return {
    thisPeriod: Object.values(thisPeriodSummary),
    lastMonth: Object.values(lastMonthSummary),
    projectBreakdown: Object.values(byProject),
  };
};

// ─── SA Dashboard ─────────────────────────────────────────────────────────────

export const getSADashboard = async () => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [
    activeProjects,
    usersByRole,
    thisMontCRs,
    lastMonthCRs,
    pendingActions,
  ] = await Promise.all([
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.user.groupBy({ by: ['role'], where: { isActive: true }, _count: { role: true } }),
    prisma.changeRequest.findMany({
      where: { createdAt: { gte: thisMonthStart }, status: { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] as CRStatus[] } },
      include: { project: { select: { hourlyRate: true, currency: true } }, impactAnalysis: { select: { estimatedHours: true } } },
    }),
    prisma.changeRequest.findMany({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] as CRStatus[] } },
      include: { project: { select: { hourlyRate: true, currency: true } }, impactAnalysis: { select: { estimatedHours: true } } },
    }),
    prisma.changeRequest.findMany({
      where: { status: 'SUBMITTED', dateOfRequest: { lt: fortyEightHoursAgo } },
      include: { project: { select: { name: true, code: true } }, submittedBy: { select: { name: true } } },
      orderBy: { dateOfRequest: 'asc' },
    }),
  ]);

  const calcCost = (crs: typeof thisMontCRs) =>
    crs.reduce((sum, cr) => {
      const hours = cr.impactAnalysis ? Number(cr.impactAnalysis.estimatedHours) : 0;
      return sum + hours * Number(cr.project.hourlyRate);
    }, 0);

  const thisMonthCost = calcCost(thisMontCRs);
  const lastMonthCost = calcCost(lastMonthCRs);
  const costChange = lastMonthCost === 0 ? null : Math.round(((thisMonthCost - lastMonthCost) / lastMonthCost) * 100);

  return {
    activeProjects,
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count.role })),
    thisMonthCRs: thisMontCRs.length,
    thisMonthCost,
    lastMonthCost,
    costChangePercent: costChange,
    pendingActions: pendingActions.map((cr) => ({
      id: cr.id,
      crNumber: cr.crNumber,
      projectName: cr.project.name,
      submittedBy: cr.submittedBy.name,
      dateOfRequest: cr.dateOfRequest,
      hoursStuck: cr.dateOfRequest
        ? Math.floor((Date.now() - new Date(cr.dateOfRequest).getTime()) / 3600000)
        : null,
    })),
  };
};
