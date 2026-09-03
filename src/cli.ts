import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { lintFile } from "./linter.js";
import type { Finding } from "./rules.js";

const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build"]);

function collectTestFiles(entryPath: string): string[] {
  const stat = statSync(entryPath);
  if (stat.isFile()) {
    return TEST_FILE_RE.test(entryPath) ? [entryPath] : [];
  }
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const name of readdirSync(entryPath)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(entryPath, name);
    const childStat = statSync(full);
    if (childStat.isDirectory()) {
      files.push(...collectTestFiles(full));
    } else if (TEST_FILE_RE.test(name)) {
      files.push(full);
    }
  }
  return files;
}

function printHuman(findings: Finding[], filesScanned: number): void {
  if (findings.length === 0) {
    console.log(`checked ${filesScanned} file(s), no findings`);
    return;
  }

  const byFile = new Map<string, Finding[]>();
  for (const finding of findings) {
    const list = byFile.get(finding.file) ?? [];
    list.push(finding);
    byFile.set(finding.file, list);
  }

  for (const [file, fileFindings] of byFile) {
    console.log(file);
    for (const f of fileFindings) {
      console.log(`  ${f.line}:  ${f.severity.padEnd(7)} ${f.ruleId}  ${f.message}`);
    }
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.length - errorCount;
  console.log(
    `\n${findings.length} finding(s) in ${byFile.size} file(s): ${errorCount} error(s), ${warningCount} warning(s)`
  );
}

function printJson(findings: Finding[], filesScanned: number): void {
  const errorCount = findings.filter((f) => f.severity === "error").length;
  console.log(
    JSON.stringify(
      {
        filesScanned,
        errorCount,
        warningCount: findings.length - errorCount,
        findings,
      },
      null,
      2
    )
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const targets = args.filter((arg) => arg !== "--json");

  if (targets.length === 0) {
    console.error("usage: test-output-lint <file-or-dir...> [--json]");
    process.exitCode = 2;
    return;
  }

  const files = targets.flatMap(collectTestFiles);
  const findings = files.flatMap((file) => lintFile(file));

  if (asJson) {
    printJson(findings, files.length);
  } else {
    printHuman(findings, files.length);
  }

  const hasErrors = findings.some((f) => f.severity === "error");
  process.exitCode = hasErrors ? 1 : 0;
}

main();
