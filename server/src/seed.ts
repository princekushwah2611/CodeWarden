import { prisma } from './db.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create a sample repository
  const repo = await prisma.repository.upsert({
    where: { githubRepoId: 987654321 },
    update: {},
    create: {
      githubRepoId: 987654321,
      name: 'auth-service',
      owner: 'acme-corp',
      installationId: 445566,
      severityThreshold: 'medium',
      autoApprove: false,
      ignoredPatterns: '*.md,*.lock,*.min.js',
    },
  });

  // 2. Create sample standards document
  await prisma.standardsDocument.create({
    data: {
      repoId: repo.id,
      sourceFile: 'engineering-standards.md',
      chunkCount: 12,
    },
  });

  // 3. Create sample reviews
  const review1 = await prisma.review.create({
    data: {
      repoId: repo.id,
      prNumber: 42,
      status: 'completed',
      actionTaken: 'request-changes',
      summary: 'CodeWarden identified 3 issues (1 Critical, 1 High, 1 Medium). Breakdown: 2 security vulnerability/risk items and 1 standards drift item. Please review the suggested changes.',
      durationMs: 42300,
      completedAt: new Date(),
    },
  });

  await prisma.finding.createMany({
    data: [
      {
        reviewId: review1.id,
        type: 'security',
        severity: 'critical',
        file: 'src/routes/auth.ts',
        lineStart: 45,
        lineEnd: 48,
        explanation: 'Untrusted user input is concatenated directly into a raw SQL query, leading to SQL Injection (CWE-89 / OWASP A03:2021). An attacker could bypass authentication or dump database contents.',
        suggestion: 'const user = await prisma.user.findFirst({ where: { email, passwordHash } });',
        ruleId: 'p/owasp-top-ten/sql-injection',
        falsePositive: false,
      },
      {
        reviewId: review1.id,
        type: 'security',
        severity: 'high',
        file: 'src/config/jwt.ts',
        lineStart: 12,
        lineEnd: 12,
        explanation: 'Hardcoded JWT secret detected in source code. Secrets committed to version control can lead to unauthorized token generation and impersonation.',
        suggestion: 'const jwtSecret = process.env.JWT_SECRET;\nif (!jwtSecret) throw new Error("Missing JWT_SECRET");',
        ruleId: 'p/secrets/hardcoded-jwt-secret',
        falsePositive: false,
      },
      {
        reviewId: review1.id,
        type: 'standards',
        severity: 'medium',
        file: 'src/services/userService.ts',
        lineStart: 88,
        lineEnd: 92,
        explanation: 'Violates team standards: Asynchronous controller methods must always wrap external I/O in structured try/catch blocks with domain error mapping.',
        suggestion: 'try {\n  return await db.query(...);\n} catch (err) {\n  throw new ServiceError("Failed to fetch user", { cause: err });\n}',
        ruleId: 'team-standards/error-handling',
        falsePositive: false,
      },
    ],
  });

  const review2 = await prisma.review.create({
    data: {
      repoId: repo.id,
      prNumber: 43,
      status: 'completed',
      actionTaken: 'approve',
      summary: 'CodeWarden analyzed this pull request and found zero security vulnerabilities or coding standard drift.',
      durationMs: 28400,
      completedAt: new Date(),
    },
  });

  console.log('✅ Seed completed successfully! Created repo:', repo.name, 'with 2 reviews and 3 findings.');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
