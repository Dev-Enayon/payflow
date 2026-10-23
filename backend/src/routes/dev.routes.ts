import { Router } from 'express';
import { z } from 'zod';
import { parseInput } from '../utils/validation';
import { ApiError } from '../utils/errors';
import { isMockGateway } from '../services/paystack.factory';
import type { PaystackGateway } from '../services/paystack.types';

const paramsSchema = z.object({ reference: z.string().min(6).max(80) });
const bodySchema = z.object({
  outcome: z.enum(['success', 'failed', 'abandoned', 'reversed', 'pending']),
});

/**
 * Local-only helper used by the mock checkout page. It is only registered when
 * PAYSTACK_MOCK=true, and mock mode is rejected in production by env validation.
 */
export function createDevRoutes() {
  const router = Router();

  router.post('/mock-payments/:reference/complete', (req, res) => {
    const gateway = req.app.locals.paystackGateway as PaystackGateway | undefined;
    if (!gateway || !isMockGateway(gateway)) {
      throw ApiError.notFound('Mock payments are not enabled');
    }
    const { reference } = parseInput(paramsSchema, req.params);
    const { outcome } = parseInput(bodySchema, req.body);
    const updated = gateway.setOutcome(reference, outcome);
    if (!updated) {
      throw ApiError.notFound('Mock payment not found');
    }
    res.json({ data: { reference, outcome } });
  });

  return router;
}
