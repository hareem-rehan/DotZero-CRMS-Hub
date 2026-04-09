import { Request, Response, NextFunction } from 'express';
import { listFinanceCRs, getFinanceCRById, getFinanceDashboard, getSADashboard, exportCRs } from './dashboard.service';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';

export const dashboardController = {
  // GET /api/v1/dashboard — role-scoped stats
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user!.role;
      const { dateFrom, dateTo } = req.query as Record<string, string>;

      if (role === 'SUPER_ADMIN') {
        const data = await getSADashboard();
        return res.json({ success: true, data, error: null, meta: null });
      }
      if (role === 'FINANCE') {
        const data = await getFinanceDashboard(dateFrom, dateTo);
        return res.json({ success: true, data, error: null, meta: null });
      }
      throw new AppError(403, 'Access denied');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/dashboard/finance/crs — Finance CR listing with cost data
  async listFinanceCRs(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, clientName, status, showAll, currency, dateFrom, dateTo, page, pageSize } = req.query as Record<string, string>;
      const data = await listFinanceCRs({
        projectId,
        clientName,
        status,
        showAll: showAll === 'true',
        currency,
        dateFrom,
        dateTo,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
      res.json({ success: true, data, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/dashboard/finance/crs/:id — Finance CR detail with cost breakdown
  async getFinanceCR(req: Request, res: Response, next: NextFunction) {
    try {
      const cr = await getFinanceCRById(req.params['id'] as string);
      if (!cr) return res.status(404).json({ success: false, data: null, error: 'CR not found', meta: null });
      res.json({ success: true, data: cr, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/dashboard/export?format=csv|pdf
  async exportCRs(req: Request, res: Response, next: NextFunction) {
    try {
      const { format = 'csv', projectId, clientName, status, showAll, dateFrom, dateTo } = req.query as Record<string, string>;
      const result = await exportCRs(format as 'csv' | 'pdf', {
        projectId, clientName, status,
        showAll: showAll === 'true',
        dateFrom, dateTo,
      });
      await createAuditLog({
        event: 'EXPORT_CRS',
        actorId: req.user!.userId,
        entityType: 'ChangeRequest',
        entityId: 'bulk',
        metadata: { format, filters: { projectId, clientName, status, showAll, dateFrom, dateTo } },
      });
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (err) {
      next(err);
    }
  },
};
