// Plain JS seed — no ts-node needed.
// Imports directly from the generated Prisma client output path so this
// works regardless of which node_modules/.prisma/client is active.
// Passwords are pre-hashed (bcrypt, cost 12) to avoid a bcrypt dep at build time.
'use strict';

const { PrismaClient } = require('../server/node_modules/.prisma/client');

const prisma = new PrismaClient();

// Pre-hashed passwords (bcrypt, cost 12):
// Admin@123 | Dm@12345 | Finance@1 | Po@123456
const HASHES = {
  admin:   '$2b$12$AwNKYCp4o7tFEt98qPPvMuOGXOrtcmN1Iz.0Dxj1pURKrH2V38TVy',
  dm:      '$2b$12$NeNQovhQ9HUvTP1sUCepPe9DYJGEDOwfAudS.f.g1b.sTjoGcyyze',
  finance: '$2b$12$JvMyswb6wL0T4EdLvUsg4.SQoNF.0JcamOE1x4ct7wiyhBvSiJD/y',
  po:      '$2b$12$WK9jdMS43cZaBLdwRveAU.PNcGQt7imnRPlx4Kq5tk0BYz9inu87e',
};

async function main() {
  console.log('Seeding database...');

  const [admin, dm, finance, po] = await Promise.all([
    prisma.user.upsert({
      where: { email_role: { email: 'admin@dotzero.com', role: 'SUPER_ADMIN' } },
      update: { name: 'Alex Carter' },
      create: { name: 'Alex Carter', email: 'admin@dotzero.com', passwordHash: HASHES.admin, role: 'SUPER_ADMIN', isActive: true },
    }),
    prisma.user.upsert({
      where: { email_role: { email: 'dm@dotzero.com', role: 'DELIVERY_MANAGER' } },
      update: { name: 'Sarah Mitchell' },
      create: { name: 'Sarah Mitchell', email: 'dm@dotzero.com', passwordHash: HASHES.dm, role: 'DELIVERY_MANAGER', isActive: true },
    }),
    prisma.user.upsert({
      where: { email_role: { email: 'finance@dotzero.com', role: 'FINANCE' } },
      update: { name: 'James Liu' },
      create: { name: 'James Liu', email: 'finance@dotzero.com', passwordHash: HASHES.finance, role: 'FINANCE', isActive: true },
    }),
    prisma.user.upsert({
      where: { email_role: { email: 'po@dotzero.com', role: 'PRODUCT_OWNER' } },
      update: { name: 'Priya Sharma' },
      create: { name: 'Priya Sharma', email: 'po@dotzero.com', passwordHash: HASHES.po, role: 'PRODUCT_OWNER', isActive: true },
    }),
  ]);

  console.log('✔ Users created');

  const [dzero, proj2] = await Promise.all([
    prisma.project.upsert({
      where: { code: 'DZERO' },
      update: {},
      create: { name: 'DotZero Internal', clientName: 'DotZero', code: 'DZERO', hourlyRate: 25, currency: 'USD', status: 'ACTIVE', assignedDmId: admin.id, showRateToDm: false },
    }),
    prisma.project.upsert({
      where: { code: 'PROJ2' },
      update: {},
      create: { name: 'Client Alpha', clientName: 'Alpha Corp', code: 'PROJ2', hourlyRate: 35, currency: 'USD', status: 'ACTIVE', assignedDmId: dm.id, showRateToDm: false },
    }),
  ]);

  console.log('✔ Projects created');

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

  for (const a of assignments) {
    await prisma.projectUser.upsert({
      where: { projectId_userId: { projectId: a.projectId, userId: a.userId } },
      update: {},
      create: a,
    });
  }

  console.log('✔ Project assignments created');
  console.log('\nSeed complete. Accounts:');
  console.log('  admin@dotzero.com   / Admin@123   (Super Admin)');
  console.log('  dm@dotzero.com      / Dm@12345    (Delivery Manager)');
  console.log('  finance@dotzero.com / Finance@1   (Finance)');
  console.log('  po@dotzero.com      / Po@123456   (Product Owner)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
