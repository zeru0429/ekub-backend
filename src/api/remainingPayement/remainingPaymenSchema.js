import { z } from 'zod';

 const remainingPaymenSchema = {
  register: z.object({
    depositId: z.number().int().positive(),
    // lotId: z.number().int().positive(),
    amountPaid: z.number().positive().optional(),
    commissionPaid: z.number().int().positive().optional(),
    // roundId: z.number().int().positive(),
    // count: z.number().int().positive()
  }),
  update: z.object({
    amountPaid: z.number().positive().optional(),
    commissionPaid: z.number().positive().optional(),
    // depositId: z.number().int(),

  }),

}
export default remainingPaymenSchema;