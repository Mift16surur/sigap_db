const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const roles = await prisma.role.count();
  const units = await prisma.hospitalUnit.count();
  const patients = await prisma.patient.count();
  const admissions = await prisma.admission.count();
  const pe = await prisma.peScreening.count();
  const hpp = await prisma.hppScreening.count();
  const audit = await prisma.auditLog.count();

  console.log(JSON.stringify({
    status: "CONNECTED_TO_POSTGRESQL",
    database: "sigap_db",
    counts: {
      users,
      roles,
      units,
      patients,
      admissions,
      pe_screenings: pe,
      hpp_screenings: hpp,
      audit_logs: audit
    }
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
