import prompts from "prompts";
import { mkdir, writeFile } from "fs/promises";
import { spawn } from "child_process";
import { existsSync } from "fs";

const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

async function install(...args: string[]) {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["install", ...args], { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) resolve(null);
      else reject(new Error(`Install failed with code ${code}`));
    });
  });
}

function getDbTypeFromArg(arg?: string): string | null {
  const map: Record<string, string> = {
    sqlite: "sqlite",
    postgres: "postgres",
    mysql: "mysql",
    none: "none",
  };
  return arg && arg in map ? map[arg] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const projectName = args[0];
  const dbArg = args.find((a) => a.startsWith("--db="))?.replace("--db=", "") ?? args[1];

  console.log(`\n${GREEN}KyRin Spawn v0.0.1-experimental.9${RESET}\n`);

  let finalProjectName = projectName;
  let finalDbType: string | null = getDbTypeFromArg(dbArg);

  if (!finalProjectName || finalProjectName.startsWith("-")) {
    const { projectName: inputName } = await prompts({
      type: "text",
      name: "projectName",
      message: "Project name:",
      initial: "my-kyrin-api",
    });
    finalProjectName = inputName;
  }

  if (!finalProjectName) {
    console.log("Cancelled");
    process.exit(0);
  }

  if (!finalDbType) {
    const { dbType } = await prompts({
      type: "select",
      name: "dbType",
      message: "Database:",
      choices: [
        { title: "SQLite", value: "sqlite" },
        { title: "PostgreSQL", value: "postgres" },
        { title: "MySQL", value: "mysql" },
        { title: "None", value: "none" },
      ],
    });
    finalDbType = dbType;
  }

  const projectDir = finalProjectName;

  if (existsSync(projectDir)) {
    console.error(`Error: Directory "${projectDir}" already exists`);
    process.exit(1);
  }

  await mkdir(projectDir, { recursive: true });
  await mkdir(`${projectDir}/src`, { recursive: true });

  const packageJson = {
    name: finalProjectName,
    version: "0.0.1",
    type: "module",
    scripts: {
      dev: "bun run --watch src/index.ts",
      start: "bun run src/index.ts",
      build: "bun build src/index.ts --outdir dist --target bun",
    },
    dependencies: {
      kyrin: "latest",
    },
  };

  await writeFile(
    `${projectDir}/package.json`,
    JSON.stringify(packageJson, null, 2)
  );

  await writeFile(`${projectDir}/tsconfig.json`, `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  }
}
`);

  await writeFile(`${projectDir}/.gitignore`, `node_modules/
dist/
*.log
*.db
.env
`);

  const indexContent = finalDbType === "none"
    ? `import { Kyrin } from "kyrin";

const app = new Kyrin({ development: true });

app.get("/", () => ({ message: "Hello Kyrin! 🐉" }));

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
`
    : `import { Kyrin, db } from "kyrin";

const app = new Kyrin({ development: true });

db.connect({
  client: "${finalDbType}",
  connection: {
    filename: "./data.db"
  },
  useNullAsDefault: true
});

app.get("/", () => ({ message: "Hello Kyrin! 🐉" }));

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
`;

  await writeFile(`${projectDir}/src/index.ts`, indexContent);

  console.log(`${GREEN}✓${RESET} Created ${finalProjectName}`);

  process.chdir(projectDir);
  await install();

  console.log(`${GREEN}✓${RESET} Installed dependencies`);
  console.log(`\n→ cd ${finalProjectName} && bun run dev\n`);
}

main().catch(console.error);