const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Cari lokasi file bin next di node_modules
function getNextBinPath() {
  const localBin = path.resolve(__dirname, "../node_modules/next/dist/bin/next");
  const rootBin = path.resolve(__dirname, "../../node_modules/next/dist/bin/next");
  if (fs.existsSync(localBin)) return localBin;
  if (fs.existsSync(rootBin)) return rootBin;
  return "next";
}

const nextBin = getNextBinPath();
const isDirectNode = fs.existsSync(nextBin);

const child = isDirectNode
  ? spawn(process.execPath, [nextBin, "dev", "-H", "0.0.0.0", "-p", "4000"], {
      stdio: ["inherit", "pipe", "inherit"],
      env: process.env,
    })
  : spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", "4000"], {
      stdio: ["inherit", "pipe", "inherit"],
      shell: true,
      env: process.env,
    });

let docsPrinted = false;

child.stdout.on("data", (chunk) => {
  let str = chunk.toString();

  if (!docsPrinted) {
    if (str.includes("- Network:")) {
      str = str.replace(
        /(- Network:[^\r\n]*)/,
        "$1\n  - Docs:         http://localhost:4000/docs"
      );
      docsPrinted = true;
    } else if (str.includes("- Local:") && !str.includes("- Network:")) {
      str = str.replace(
        /(- Local:[^\r\n]*)/,
        "$1\n  - Docs:         http://localhost:4000/docs"
      );
      docsPrinted = true;
    }
  }

  process.stdout.write(str);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
  process.exit(0);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
