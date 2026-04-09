import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { prisma } from '../../config/db';

export const auditLogRouter = Router();

auditLogRouter.use(authenticateToken, roleGuard(['SUPER_ADMIN']));

// GET /api/v1/audit-log
auditLogRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { event, entityType, actorId, search, page, pageSize } = req.query;

    const pg = Math.max(1, page ? Number(page) : 1);
    const ps = Math.min(100, pageSize ? Number(pageSize) : 50);
    const skip = (pg - 1) * ps;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (event) where.event = { contains: event as string, mode: 'insensitive' };
    if (entityType) where.entityType = entityType as string;
    if (actorId) where.actorId = actorId as string;
    if (search) {
      where.OR = [
        { event: { contains: search as string, mode: 'insensitive' } },
        { entityType: { contains: search as string, mode: 'insensitive' } },
        { entityId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: ps,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { logs, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) },
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
});
