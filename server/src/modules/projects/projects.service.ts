import { prisma } from '../../config/db';
import { createAuditLog } from '../../utils/auditLog';
import { uploadToS3 } from '../../utils/fileUpload';
import type { CreateProjectInput, UpdateProjectInput } from './projects.validation';

// ─── Auto-generate project code ──────────────────────────────────────────────

const generateCode = async (): Promise<string> => {
  const count = await prisma.project.count();
  const base = `PROJ${String(count + 1).padStart(3, '0')}`;
  // Ensure uniqueness (retry if collision)
  const existing = await prisma.project.findUnique({ where: { code: base } });
  if (existing) {
    return `PROJ${String(count + 100).padStart(3, '0')}`;
  }
  return base;
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listProjects = async (query: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, query.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedDm: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            changeRequests: true,
            userAssignments: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ─── Detail ───────────────────────────────────────────────────────────────────

export const getProjectById = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assignedDm: { select: { id: true, name: true, email: true, role: true } },
      userAssignments: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
      },
      attachments: true,
      _count: {
        select: {
          changeRequests: true,
        },
      },
    },
  });

  if (!project) return null;

  // Aggregate approved CR hours via ImpactAnalysis
  const approvedHoursResult = await prisma.impactAnalysis.aggregate({
    where: { changeRequest: { projectId: id, status: 'APPROVED' } },
    _sum: { estimatedHours: true },
  });

  const totalApprovedHours = Number(approvedHoursResult._sum?.estimatedHours ?? 0);
  const totalApprovedCost = totalApprovedHours * Number(project.hourlyRate);

  return {
    ...project,
    totalApprovedHours,
    totalApprovedCost,
  };
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createProject = async (
  input: CreateProjectInput,
  actorId: string,
  files?: Express.Multer.File[],
) => {
  const code = input.code ?? (await generateCode());

  // Check code uniqueness
  const existing = await prisma.project.findUnique({ where: { code } });
  if (existing) {
    throw Object.assign(new Error(`Project code "${code}" is already in use`), { statusCode: 409 });
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      clientName: input.clientName,
      code,
      hourlyRate: input.hourlyRate,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'ACTIVE',
      startDate: input.startDate ? new Date(input.startDate) : null,
      assignedDmId: input.assignedDmId ?? null,
      showRateToDm: input.showRateToDm ?? false,
      sowReference: input.sowReference ?? null,
    },
  });

  // Upload attachments if provided
  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadToS3(f, `projects/${project.id}`)));
    await prisma.projectAttachment.createMany({
      data: uploads.map((u) => ({
        projectId: project.id,
        fileName: u.fileName,
        fileUrl: u.url,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
      })),
    });
  }

  await createAuditLog({
    event: 'PROJECT_CREATED',
    actorId,
    entityType: 'Project',
    entityId: project.id,
    metadata: { name: project.name, code: project.code },
  });

  return project;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateProject = async (
  id: string,
  input: UpdateProjectInput,
  actorId: string,
  files?: Express.Multer.File[],
) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.clientName !== undefined && { clientName: input.clientName }),
      ...(input.hourlyRate !== undefined && { hourlyRate: input.hourlyRate }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.assignedDmId !== undefined && { assignedDmId: input.assignedDmId }),
      ...(input.showRateToDm !== undefined && { showRateToDm: input.showRateToDm }),
      ...(input.sowReference !== undefined && { sowReference: input.sowReference }),
    },
  });

  // Upload new attachments if provided
  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadToS3(f, `projects/${id}`)));
    await prisma.projectAttachment.createMany({
      data: uploads.map((u) => ({
        projectId: id,
        fileName: u.fileName,
        fileUrl: u.url,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
      })),
    });
  }

  await createAuditLog({
    event: 'PROJECT_UPDATED',
    actorId,
    entityType: 'Project',
    entityId: id,
    metadata: { changes: input },
  });

  return updated;
};

// ─── Archive (soft delete) ────────────────────────────────────────────────────

export const archiveProject = async (id: string, actorId: string) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  await createAuditLog({
    event: 'PROJECT_ARCHIVED',
    actorId,
    entityType: 'Project',
    entityId: id,
    metadata: { previousStatus: project.status },
  });

  return updated;
};

export const unarchiveProject = async (id: string, actorId: string) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });

  await createAuditLog({
    event: 'PROJECT_UNARCHIVED',
    actorId,
    entityType: 'Project',
    entityId: id,
  });

  return updated;
};

// ─── DM dropdown (SA + DM users, active only) ─────────────────────────────────

export const getDmDropdownUsers = async () => {
  return prisma.user.findMany({
    where: {
      role: { in: ['DELIVERY_MANAGER', 'SUPER_ADMIN'] },
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
};
