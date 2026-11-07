import { z } from 'astro/zod';
import { voteCodes, type VoteCode } from './Session.ts';
import {
  findPresentMembersViolation,
  majorityRequirements,
  type MajorityRequirement,
  type SessionScan,
} from './session-scan.ts';

// Runtime schema for the session-scan files, consumed by the Astro content
// collection. Scans can be corrected by hand, so an unknown vote code must fail
// the build instead of silently skewing counts.
// Uses astro/zod (= zod v4) so the schema object matches the instance Astro's
// content-collection validator expects.

const voteCodeSchema = z.enum(voteCodes);
const majorityRequirementSchema = z.enum(majorityRequirements);

export const sessionScanSchema = z.array(
  z
    .object({
      votingFilename: z.string(),
      videoTimestamp: z.string(),
      votingSubject: z.object({
        agendaItem: z.string(),
        motionId: z.string(),
        title: z.string(),
        type: z.string().nullable(),
        authors: z.array(z.string()),
      }),
      votes: z.array(
        z.object({
          name: z.string(),
          vote: voteCodeSchema,
        }),
      ),
      majorityRequirement: majorityRequirementSchema.optional(),
      presentMembers: z.number().int().optional(),
    })
    .superRefine((voting, context) => {
      const violation = findPresentMembersViolation(voting);
      if (violation) {
        context.addIssue({
          code: 'custom',
          path: ['presentMembers'],
          message: violation,
        });
      }
    }),
);

// Compile-time drift guards: build fails if a schema and its canonical type diverge.
type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
export const _schemasMatchTypes: [
  AssertEqual<z.infer<typeof voteCodeSchema>, VoteCode>,
  AssertEqual<z.infer<typeof majorityRequirementSchema>, MajorityRequirement>,
  AssertEqual<z.infer<typeof sessionScanSchema>, SessionScan>,
] = [true, true, true];
