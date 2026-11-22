import { z } from 'zod';
import { SUPPLIERS, type SupplierName } from '../types';
import { normalizeCity } from '../utils/normalize';

const emptyToUndefined = (value: unknown) => (value === '' || value === undefined ? undefined : value);

const price = z.preprocess(
  emptyToUndefined,
  z.coerce.number({ error: 'must be a number' }).finite('must be a finite number').min(0, 'must be >= 0').optional(),
);

const bool = z.preprocess(
  emptyToUndefined,
  z.enum(['true', 'false', '1', '0'], { error: "must be 'true' or 'false'" }).optional().transform((v) => v === 'true' || v === '1'),
);

export const citySchema = z
  .string({ error: 'city is required' })
  .trim()
  .min(1, 'city is required')
  .max(60)
  .regex(/^[\p{L}\s.'-]+$/u, 'city contains invalid characters')
  .transform(normalizeCity);

const supplierSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .transform((value, ctx): SupplierName => {
      const compact = value.toLowerCase().replace(/\s+/g, '');
      const match = Object.entries(SUPPLIERS).find(([key, name]) => key.toLowerCase() === compact || name.toLowerCase().replace(/\s+/g, '') === compact);
      if (!match) {
        ctx.addIssue({ code: 'custom', message: "must be 'Supplier A' or 'Supplier B'" });
        return 'Supplier A';
      }
      return match[1];
    })
    .optional(),
);

export const hotelQuerySchema = z
  .object({
    city: citySchema,
    minPrice: price,
    maxPrice: price,
    sortBy: z.enum(['price', 'rating', 'commission']).default('price'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    supplier: supplierSchema,
    refresh: bool,
    minRating: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(5).optional()),
    q: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  });

export type HotelQuery = z.infer<typeof hotelQuerySchema>;

export const offersQuerySchema = z.object({ city: citySchema });

export const citySearchSchema = z.object({ city: citySchema });

export const currencyQuerySchema = z.object({}).passthrough();

export const simulationBodySchema = z.object({
  enabled: z.boolean().optional(),
  latencyMs: z.number().int().min(0).max(30000).optional(),
  errorRate: z.number().min(0).max(1).optional(),
});
