import { z } from 'zod';

const winnerSchema = {
  register: z.object({
    lotId: z.number().int().positive(),
    // count: z.number().int().positive()
  }),
  update: z.object({
    lotId: z.number().int().positive().optional(),
    // count: z.number().int().positive().optional()
  }),
};
export default winnerSchema