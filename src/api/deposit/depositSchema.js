import { z } from 'zod';

export const depositSchema = {
  register: z.object({
    lotId: z.number().int().positive(),
    amount: z.number().positive().optional(),
    commition: z.number().positive().optional(),
    // roundId: z.number().int().positive(),
    // count: z.number().int().positive()
  }),
  update: z.object({
    amount: z.number().positive(),
    commition: z.number().positive(),
  }),

}
export default depositSchema;