# test-output-lint

A test suite is only as trustworthy as its output. It's easy to commit
things that quietly wreck that output without ever failing a build:

- an `it.only(...)` left in after debugging, which silently skips every
  other test in the file — the run stays green, but most of it never ran
- a `test.skip(...)` or `xit(...)` that hides a broken test as "not run"
  instead of failing
- a stray `console.log` inside a test body that interleaves with the
  reporter's own output and makes CI logs unreadable
- an empty test body (`it('does the thing', () => {})`) that passes
  without asserting anything
- two tests in the same file with the same title, so a failure in the
  test report can't tell you which one actually broke

None of these will fail a CI run on their own. This tool scans test
source files for them directly and reports each one with the line
number it occurred on, so you can catch it before it ever produces
misleading output.

## Usage

Point it at a file or a directory (it recurses, looking for
`*.test.ts`, `*.spec.ts`, and the `.js`/`.tsx`/`.jsx` equivalents,
skipping `node_modules`, `.git`, `dist`, and `build`):

```
node --experimental-strip-types src/cli.ts ./src
```

Human-readable output:

```
src/user.test.ts
  12:  error   no-only  focused test (.only) will silently skip every other test's output
  40:  warning no-console  console call will interleave with the test reporter's own output

2 finding(s) in 1 file(s): 1 error(s), 1 warning(s)
```

Machine-readable output for CI or editor integrations, with `--json`:

```
node --experimental-strip-types src/cli.ts ./src --json
```

```json
{
  "filesScanned": 3,
  "errorCount": 1,
  "warningCount": 1,
  "findings": [
    {
      "file": "src/user.test.ts",
      "line": 12,
      "ruleId": "no-only",
      "severity": "error",
      "message": "focused test (.only) will silently skip every other test's output"
    }
  ]
}
```

The process exits with code `1` if any finding is `error` severity,
`0` otherwise, so it can be dropped straight into a CI step.

## Rules

| id | severity | catches |
| --- | --- | --- |
| `no-only` | error | `it.only` / `test.only` / `describe.only` |
| `no-empty-test` | error | one-line test bodies with nothing in them |
| `no-skip` | warning | `it.skip` / `test.skip` / `xit` / `xdescribe` |
| `no-console` | warning | `console.log`/`warn`/`error`/`debug`/`info` inside a test |
| `no-duplicate-title` | warning | two tests in one file sharing a title |

## Requirements

Node 22.6 or later, run with `--experimental-strip-types` (or any
Node version where type stripping is enabled by default). No build
step, no npm install — everything here is the TypeScript source plus
Node's own standard library.

## Status

Early skeleton. Rules are line-based regex matches, so they don't yet
see across multiple lines — a multi-line empty test body or a title
built from a template literal won't be caught. See the rule table
above for what's covered today.
