// Feature: module-structure-refactor, Property 4: Validator Exports Zod Schemas and Inferred Types

import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

/**
 * Collect all validator files under src/modules/{domain}/validators/
 */
function getValidatorFiles(): string[] {
  const modulesDir = path.resolve(__dirname, "..");
  const files: string[] = [];

  const moduleDirs = fs
    .readdirSync(modulesDir)
    .filter((entry) => {
      const full = path.join(modulesDir, entry);
      return fs.statSync(full).isDirectory() && !entry.startsWith("__");
    });

  for (const mod of moduleDirs) {
    const validatorsDir = path.join(modulesDir, mod, "validators");
    if (!fs.existsSync(validatorsDir)) continue;

    const validatorFiles = fs
      .readdirSync(validatorsDir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => path.join(validatorsDir, f));

    files.push(...validatorFiles);
  }

  return files;
}

/**
 * Validates: Requirements 4.1, 4.2
 *
 * Property 4: For any validator file under src/modules/{domain}/validators/, the file
 * should export at least one Zod schema and at least one TypeScript type derived
 * via z.infer.
 */
describe("Module Structure – Property 4: Validator Exports Zod Schemas and Inferred Types", () => {
  it(
    "Property 4: every validator file exports at least one Zod schema and one z.infer type",
    () => {
      const allValidatorFiles = getValidatorFiles();

      // Ensure we actually found validator files to test
      expect(allValidatorFiles.length).toBeGreaterThan(0);

      fc.assert(
        fc.property(
          // Generate arbitrary subsets (indices) of the validator files array
          fc.array(
            fc.integer({ min: 0, max: allValidatorFiles.length - 1 }),
            { minLength: 1, maxLength: allValidatorFiles.length },
          ),
          (indices: number[]) => {
            // Deduplicate indices so each file is checked at most once per run
            const uniqueIndices = [...new Set(indices)];

            for (const idx of uniqueIndices) {
              const filePath = allValidatorFiles[idx];
              const content = fs.readFileSync(filePath, "utf8");
              const relativePath = path.relative(process.cwd(), filePath);

              // Assert: at least one exported Zod schema
              // Matches patterns like:
              //   export const fooSchema = z.object(
              //   export const fooSchema = z.string(
              //   export const fooSchema = z.array(
              //   export const fooSchema = z.enum(
              //   export const fooSchema = z.
              const hasZodSchemaExport = /export\s+const\s+\w+\s*=\s*z\./.test(content);
              expect(hasZodSchemaExport).toBe(true);

              // Assert: at least one z.infer< type export
              // Matches patterns like:
              //   export type Foo = z.infer<typeof fooSchema>
              const hasZodInferExport = /z\.infer</.test(content);
              expect(hasZodInferExport).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
