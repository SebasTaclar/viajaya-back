# dataor-back
Project for Dataor

## Setup

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
npm run start
```

## Seed - Crear usuario admin

```bash
npm run db:seed
```

Las credenciales se leen de `local.settings.json` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). Ambas son requeridas.