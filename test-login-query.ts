import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'heroicniyihoraho@gmail.com' },
            include: {
                userRole: {
                    include: {
                        region: true,
                        university: true,
                        smallGroup: true,
                        graduateSmallGroup: true,
                    }
                }
            }
        });
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error("Auth error:", error)
    } finally {
        await prisma.$disconnect();
    }
}
main();
