import { z } from 'zod';

/**
 * Zod validation schema representing structured comparative analysis details from Gemini.
 */
export const comparisonLlmSchema = z.object({
  summary: z.string({
    required_error: 'Comparison summary is required',
    invalid_type_error: 'Comparison summary must be a string'
  }).min(1, 'Comparison summary cannot be empty'),

  insights: z.object({
    strengthsA: z.array(z.string().min(1, 'Strength A entry cannot be empty'), {
      required_error: 'strengthsA array is required'
    }).min(1, 'At least one strength for Company A is required'),

    strengthsB: z.array(z.string().min(1, 'Strength B entry cannot be empty'), {
      required_error: 'strengthsB array is required'
    }).min(1, 'At least one strength for Company B is required'),

    weaknessesA: z.array(z.string().min(1, 'Weakness A entry cannot be empty'), {
      required_error: 'weaknessesA array is required'
    }).min(1, 'At least one weakness for Company A is required'),

    weaknessesB: z.array(z.string().min(1, 'Weakness B entry cannot be empty'), {
      required_error: 'weaknessesB array is required'
    }).min(1, 'At least one weakness for Company B is required')
  }, {
    required_error: 'Insights structure is required'
  })
});
