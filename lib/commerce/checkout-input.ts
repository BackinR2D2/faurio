import { z } from "zod";

export const checkoutSchema = z.object({
  requestId: z.uuid().optional(),
  items: z.array(z.object({ id: z.string().min(1).max(200), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(20),
  email: z.email().max(180),
  coupon: z.string().max(40).optional(),
  customer: z.object({ name: z.string().trim().min(2).max(120), phone: z.string().max(40).optional(), address: z.string().trim().min(3).max(240), city: z.string().trim().min(2).max(100), county: z.string().trim().min(2).max(100), postalCode: z.string().trim().min(3).max(20) }).strict(),
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
