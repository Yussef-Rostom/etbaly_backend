// Feature: order-module, Property 9: non-hex :id always returns 400 before service is called

import * as fc from "fast-check";
import { objectIdParamSchema } from "../validators/orderValidators";

/**
 * Validates: Requirements 2.4, 5.1
 *
 * Property 9: For any request to a route that accepts an :id param, supplying a
 * string that is not a 24-character hex ObjectId should result in a 400 validation
 * error — never a 500 or a database query.
 *
 * Tested here as a pure Zod schema property: objectIdParamSchema.safeParse({ id })
 * must return success: false for any non-valid ObjectId string.
 */

const HEX_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Arbitrary: any string that is NOT a valid 24-char hex ObjectId.
 * Three sub-cases:
 *   1. Wrong length (too short: 0–23, or too long: 25–60)
 *   2. Exactly 24 chars but contains at least one non-hex character
 */
const invalidObjectIdArb = fc.oneof(
  // Too short
  fc.string({ minLength: 0, maxLength: 23 }),
  // Too long
  fc.string({ minLength: 25, maxLength: 60 }),
  // Exactly 24 chars with at least one non-hex character
  fc
    .string({ minLength: 24, maxLength: 24 })
    .filter((s) => !HEX_REGEX.test(s)),
);

/** Arbitrary: exactly 24 hex characters — always a valid ObjectId */
const validObjectIdArb = fc.stringMatching(/^[0-9a-fA-F]{24}$/, {
  size: "=",
});

describe("objectIdParamSchema — Property 9 (PBT)", () => {
  // Feature: order-module, Property 9: non-hex :id always returns 400 before service is called
  it("rejects any string that is not a valid 24-char hex ObjectId", () => {
    fc.assert(
      fc.property(invalidObjectIdArb, (id) => {
        const result = objectIdParamSchema.safeParse({ id });
        return result.success === false;
      }),
      { numRuns: 100 },
    );
  });

  // Feature: order-module, Property 9 (complementary): valid 24-char hex ObjectId is always accepted
  it("accepts any valid 24-char hex ObjectId string", () => {
    fc.assert(
      fc.property(validObjectIdArb, (id) => {
        const result = objectIdParamSchema.safeParse({ id });
        return result.success === true;
      }),
      { numRuns: 100 },
    );
  });
});
