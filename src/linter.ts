import { readFileSync } from "node:fs";
import { rules, type Finding } from "./rules.js";

export function lintSource(file: string, source: string): Finding[] {
  const lines = source.split(/\r?\n/);
  const findings: Finding[] = [];
  for (const rule of rules) {
    for (const hit of rule.check(lines)) {
      findings.push({
        file,
        line: hit.line,
        ruleId: rule.id,
        severity: rule.severity,
        message: hit.message,
      });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

export function lintFile(file: string): Finding[] {
  const source = readFileSync(file, "utf8");
  return lintSource(file, source);
}

export type { Finding };
