import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';

interface AuditLogEntry {
  event: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        event: entry.event,
        actorId: entry.actorId ?? null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    // Audit log failures must not block operations
    logger.error({ err, entry }, 'Failed to write audit log');
  }
};
