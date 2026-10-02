import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvVars() {
  const settingsPath = path.join(__dirname, '..', 'local.settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    for (const [key, value] of Object.entries(settings.Values || {})) {
      if (!process.env[key]) {
        process.env[key] = value as string;
      }
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  loadEnvVars();

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in local.settings.json or as environment variables.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user ${adminEmail} already exists. Skipping seed.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Super Administrator',
      role: 'superadmin',
      membershipPaid: true,
    },
  });

  console.log(`SuperAdmin user created: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
