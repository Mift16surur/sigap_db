const { spawn } = require("child_process");
const os = require("os");

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIp = getLocalIp();

console.log("=========================================");
console.log("  SIGAP Clinical — Server Siap Diakses");
console.log("  Akses Lokal    : http://localhost:3000");
console.log(`  Akses Jaringan : http://${localIp}:3000`);
console.log(`  Swagger Docs   : http://${localIp}:4000/docs`);
console.log("=========================================\n");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const backend = spawn(npmCmd, ["--workspace=backend", "run", "start"], {
  stdio: "inherit",
  shell: true,
});

const frontend = spawn(npmCmd, ["--workspace=frontend", "run", "start"], {
  stdio: "inherit",
  shell: true,
});

function cleanup() {
  console.log("\nMematikan semua server SIGAP...");
  if (backend.pid) process.kill(backend.pid);
  if (frontend.pid) process.kill(frontend.pid);
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
