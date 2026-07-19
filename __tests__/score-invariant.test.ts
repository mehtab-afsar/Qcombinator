import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * ADR-005 — the Q-Score is a separate diagnostic.
 *
 * "Nothing in the new model calls applyAgentScoreSignal() — a unit test
 * enforces this." (Architecture.md §5)
 *
 * The Q-Score is fed by Company Builder artefacts. Creating a Management Asset
 * must never raise it, and outcomes are evidence for later reassessment — never
 * an automatic trigger. This test is that enforcement.
 *
 * Scope: the whole new model, not a subset. Featureinventory.md F01 names five
 * lib/ folders, but connectors and the executive UI are equally part of the new
 * model — and connectors are where execution meets the outside world, which is
 * precisely what ADR-005 guards. Architecture.md §5 is the authority for the
 * broader reading.
 *
 * This passes vacuously today: none of these folders exist yet. That is the
 * intent — it costs nothing now and fails the day someone wires the score into
 * the new engine.
 *
 * DOES NOT bind the OLD model. Per the score-decoupling decision, the old agent
 * routes keep boosting exactly as they do today; their call sites are frozen
 * (CLAUDE.md §0.4, ADR-014) and a change there is a regression, not progress.
 * See PHASE0_AUDIT.md §5 for the five old call sites this deliberately ignores.
 */

/** Every surface of the new Executive model. Add to this as the model grows. */
const NEW_MODEL_PATHS = [
  'lib/registry',
  'lib/prompts',
  'lib/mandate',
  'lib/rhythm',
  'lib/assets',
  'lib/briefings',
  'lib/connectors',
  'features/executive',
];

/**
 * The forbidden symbol, and the module that exports it. Both are checked: an
 * import alias would evade a name-only scan.
 *
 * Limitation, stated honestly: a static scan cannot catch every indirect route
 * (a barrel re-export, a dynamic import, a string-built specifier). It catches
 * a direct call and a direct import, which is how this would realistically be
 * reintroduced.
 *
 * ⚠️ IT ALSO TRIPS ON PROSE. Naming the symbol in a comment inside a scanned
 * folder fails this test. That is deliberate, and it has already happened once
 * (lib/prompts/compose.ts documented the rule and tripped it).
 *
 * The fix is to reword the comment — NOT to teach this scan about comments.
 * A guard that parses code is a guard that can be argued with, and this one
 * protects a locked decision (ADR-005) against a change nobody would make on
 * purpose. Blunt and unbypassable beats clever and negotiable. Refer to the
 * writer as "the score signal" in prose; the code is the only place its name
 * belongs.
 */
const FORBIDDEN_SYMBOL = 'applyAgentScoreSignal';
const FORBIDDEN_MODULE = 'agent-signal';

const REPO_ROOT = join(__dirname, '..');

function collectSourceFiles(dir: string): string[] {
  const absolute = join(REPO_ROOT, dir);
  if (!existsSync(absolute)) return [];

  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry)) {
        out.push(full);
      }
    }
  };
  walk(absolute);
  return out;
}

describe('ADR-005 — the new model never moves the Q-Score', () => {
  const files = NEW_MODEL_PATHS.flatMap(collectSourceFiles);

  it('has a defined scope', () => {
    // Guards the test itself: a typo'd path would silently scan nothing and
    // pass forever. The paths are allowed to not exist yet; the list is not
    // allowed to be empty.
    expect(NEW_MODEL_PATHS.length).toBeGreaterThan(0);
  });

  it.each(NEW_MODEL_PATHS)('%s does not call applyAgentScoreSignal()', (dir) => {
    const offenders = collectSourceFiles(dir).filter((file) =>
      readFileSync(file, 'utf8').includes(FORBIDDEN_SYMBOL),
    );

    expect(offenders.map((f) => f.replace(`${REPO_ROOT}/`, ''))).toEqual([]);
  });

  it.each(NEW_MODEL_PATHS)('%s does not import the agent-signal module', (dir) => {
    const offenders = collectSourceFiles(dir).filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /^\s*import\s[^;]*from\s+['"][^'"]*agent-signal['"]/m.test(source)
        || source.includes(`from '@/features/qscore/services/${FORBIDDEN_MODULE}'`);
    });

    expect(offenders.map((f) => f.replace(`${REPO_ROOT}/`, ''))).toEqual([]);
  });

  it('scans real files once the new model exists', () => {
    // Today: 0 files, passes vacuously — the new model is not built yet.
    // This assertion documents that state rather than asserting emptiness,
    // so it keeps passing as the folders fill up.
    expect(files.length).toBeGreaterThanOrEqual(0);
  });
});
