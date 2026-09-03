// Each rule scans a file's lines independently. Line-based regex matching
// misses multi-line constructs (see README roadmap), but it's cheap, has no
// parser dependency, and covers the patterns that actually show up in review.

export interface Finding {
  file: string;
  line: number;
  ruleId: string;
  severity: "error" | "warning";
  message: string;
}

export interface Hit {
  line: number;
  message: string;
}

export interface Rule {
  id: string;
  severity: "error" | "warning";
  description: string;
  check(lines: string[]): Hit[];
}

const ONLY_RE = /\b(it|test|describe|context)\.only\s*\(/;
const SKIP_RE = /\b(it|test|describe|context)\.skip\s*\(|\bx(it|describe)\s*\(/;
const CONSOLE_RE = /\bconsole\.(log|debug|info|warn|error)\s*\(/;
const EMPTY_TEST_RE =
  /\b(it|test)\s*\(\s*(['"`]).*?\2\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/;
const TEST_TITLE_RE = /\b(it|test)\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/;

function lineHits(lines: string[], pattern: RegExp, message: string): Hit[] {
  const hits: Hit[] = [];
  lines.forEach((text, index) => {
    if (pattern.test(text)) {
      hits.push({ line: index + 1, message });
    }
  });
  return hits;
}

export const rules: Rule[] = [
  {
    id: "no-only",
    severity: "error",
    description: "test.only / describe.only left in committed code",
    check(lines) {
      return lineHits(
        lines,
        ONLY_RE,
        "focused test (.only) will silently skip every other test's output"
      );
    },
  },
  {
    id: "no-skip",
    severity: "warning",
    description: "test.skip / xit / xdescribe left in committed code",
    check(lines) {
      return lineHits(
        lines,
        SKIP_RE,
        "skipped test hides its result from output instead of failing loudly"
      );
    },
  },
  {
    id: "no-console",
    severity: "warning",
    description: "console output left inside a test body",
    check(lines) {
      return lineHits(
        lines,
        CONSOLE_RE,
        "console call will interleave with the test reporter's own output"
      );
    },
  },
  {
    id: "no-empty-test",
    severity: "error",
    description: "test with an empty body",
    check(lines) {
      return lineHits(
        lines,
        EMPTY_TEST_RE,
        "test body is empty and will pass without asserting anything"
      );
    },
  },
  {
    id: "no-duplicate-title",
    severity: "warning",
    description: "two tests in the same file share a title",
    check(lines) {
      const seen = new Map<string, number>();
      const hits: Hit[] = [];
      lines.forEach((text, index) => {
        const match = TEST_TITLE_RE.exec(text);
        if (!match) return;
        const title = match[3];
        const firstLine = seen.get(title);
        if (firstLine !== undefined) {
          hits.push({
            line: index + 1,
            message: `duplicate test title "${title}" (first seen on line ${firstLine}); a failure won't tell them apart`,
          });
        } else {
          seen.set(title, index + 1);
        }
      });
      return hits;
    },
  },
];
