import { z } from 'zod';

export const loanSchema = {
  register: z.object({
    lotId: z.number().int().positive(),
    amount: z.number().positive(),
    // count : z.number().positive()
  }),
  update: z.object({
    amount: z.number().positive(),
    // count :z.number().positive().optional()
  }),
  
}

export default loanSchema;