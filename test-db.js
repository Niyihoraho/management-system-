const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({ orderBy: { id: 'desc' }, take: 3 });
  students.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.fullName}, Course: "${s.course}", Prov: "${s.placeOfBirthProvince}", Dist: "${s.placeOfBirthDistrict}", Sec: "${s.placeOfBirthSector}"`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
