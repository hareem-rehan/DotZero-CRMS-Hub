import { PrismaClient, Role, Currency, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Users ─────────────────────────────────────────────────────────────────

  const [admin, dm, finance, po] = await Promise.all([
    prisma.user.upsert({
      where: { email_role: { email: 'admin@dotzero.com', role: Role.SUPER_ADMIN } },
      update: { name: 'Alex Carter' },
      create: {
        name: 'Alex Carter',
        email: 'admin@dotzero.com',
        passwordHash: await bcrypt.hash('Admin@123', 12),
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email_role: { email: 'dm@dotzero.com', role: Role.DELIVERY_MANAGER } },
      update: { name: 'Sarah Mitchell' },
      create: {
        name: 'Sarah Mitchell',
        email: 'dm@dotzero.com',
        passwordHash: await bcrypt.hash('Dm@12345', 12),
        role: Role.DELIVERY_MANAGER,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email_role: { email: 'finance@dotzero.com', role: Role.FINANCE } },
      update: { name: 'James Liu' },
      create: {
        name: 'James Liu',
        email: 'finance@dotzero.com',
        passwordHash: await bcrypt.hash('Finance@1', 12),
        role: Role.FINANCE,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email_role: { email: 'po@dotzero.com', role: Role.PRODUCT_OWNER } },
      update: { name: 'Priya Sharma' },
      create: {
        name: 'Priya Sharma',
        email: 'po@dotzero.com',
        passwordHash: await bcrypt.hash('Po@123456', 12),
        role: Role.PRODUCT_OWNER,
        isActive: true,
      },
    }),
  ]);

  console.log('✔ Users created');

  // ─── Projects ──────────────────────────────────────────────────────────────

  const [dzero, proj2] = await Promise.all([
    prisma.project.upsert({
      where: { code: 'DZERO' },
      update: {},
      create: {
        name: 'DotZero Internal',
        clientName: 'DotZero',
        code: 'DZERO',
        hourlyRate: 25,
        currency: Currency.USD,
        status: ProjectStatus.ACTIVE,
        assignedDmId: admin.id, // SA assigned as DM for DZERO
        showRateToDm: false,
      },
    }),
    prisma.project.upsert({
      where: { code: 'PROJ2' },
      update: {},
      create: {
        name: 'Client Alpha',
        clientName: 'Alpha Corp',
        code: 'PROJ2',
        hourlyRate: 35,
        currency: Currency.USD,
        status: ProjectStatus.ACTIVE,
        assignedDmId: dm.id,
        showRateToDm: false,
      },
    }),
  ]);

  console.log('✔ Projects created');

  // ─── ProjectUser assignments ────────────────────────────────────────────────

  const assignments = [
    { projectId: dzero.id, userId: admin.id },
    { projectId: dzero.id, userId: dm.id },
    { projectId: dzero.id, userId: finance.id },
    { projectId: dzero.id, userId: po.id },
    { projectId: proj2.id, userId: admin.id },
    { projectId: proj2.id, userId: dm.id },
    { projectId: proj2.id, userId: finance.id },
    { projectId: proj2.id, userId: po.id },
  ];

  for (const assignment of assignments) {
    await prisma.projectUser.upsert({
      where: {
        projectId_userId: {
          projectId: assignment.projectId,
          userId: assignment.userId,
        },
      },
      update: {},
      create: assignment,
    });
  }

  console.log('✔ Project assignments created');
  console.log('\nSeed complete. Accounts:');
  console.log('  admin@dotzero.com  / Admin@123   (Super Admin)');
  console.log('  dm@dotzero.com     / Dm@12345    (Delivery Manager)');
  console.log('  finance@dotzero.com / Finance@1  (Finance)');
  console.log('  po@dotzero.com     / Po@123456   (Product Owner)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
