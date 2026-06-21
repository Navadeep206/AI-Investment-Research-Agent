import { z } from 'zod';

/**
 * Zod validation schema representing a single piece of collected evidence.
 */
export const evidenceItemSchema = z.object({
  claim: z.string({
    required_error: 'claim is required',
    invalid_type_error: 'claim must be a string'
  }).min(1, 'claim cannot be empty'),

  source: z.string({
    required_error: 'source is required',
    invalid_type_error: 'source must be a string'
  }).min(1, 'source cannot be empty'),

  url: z.string({
    required_error: 'url is required',
    invalid_type_error: 'url must be a string'
  }).url('url must be a valid URL format'),

  confidence: z.number({
    required_error: 'confidence is required',
    invalid_type_error: 'confidence must be a number'
  }).int().min(0).max(100)
});

/**
 * Zod validation schema representing a list of evidence items.
 * Constrained to a maximum of 10 items.
 */
export const evidenceSchema = z.array(evidenceItemSchema).max(10, 'Cannot exceed 10 evidence items');
