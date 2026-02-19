const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  try {
    const emailArg = process.argv[2];
    const passwordArg = process.argv[3];

    const email = emailArg || process.env.USER_EMAIL || 'heroicrwand@gmail.com';
    const plainPassword = passwordArg || process.env.USER_PASSWORD || 'admin@123';

    const hashed = await bcrypt.hash(plainPassword, 12);

    // Update password by email; if not found, fetch to check existence
    let user = null;
    try {
      user = await prisma.user.update({ where: { email }, data: { password: hashed } });
    } catch (err) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      console.error('❌ User not found for email:', email);
      process.exit(1);
    }

    // Ensure superadmin role exists
    const existing = await prisma.userrole.findFirst({
      where: { userId: user.id, scope: 'superadmin' }
    });
    if (!existing) {
      await prisma.userrole.create({ data: { userId: user.id, scope: 'superadmin' } });
    }

    console.log(JSON.stringify({ ok: true, userId: user.id }, null, 2));
  } catch (error) {
    console.error('❌ Failed to assign superadmin or set password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };


