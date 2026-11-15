/**
 * Example Routes untuk Modul Auth (Mock / Integration Tests)
 */
export const exampleAuthRoutes = [
  {
    path: "/api/v1/auth/login",
    method: "POST",
    description: "Login umum dokter / perawat / klinisi",
    sampleBody: { username: "bidan.ratna", password: "sigap2026" },
  },
  {
    path: "/api/v1/auth/admin-login",
    method: "POST",
    description: "Login portal khusus Administrator (Admin RS & Admin TI)",
    sampleBody: { action: "ADMIN_LOGIN", username: "admin.rs", password: "admin2026" },
  },
  {
    path: "/api/v1/auth/create-user",
    method: "POST",
    description: "Pendaftaran akun baru (Superapps RBAC)",
    sampleBody: { action: "CREATE_USER", username: "dr.baru", full_name: "dr. Baru", role_id: "DOKTER" },
  },
];

