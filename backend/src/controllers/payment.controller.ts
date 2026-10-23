import type { Request, Response } from 'express';
import { z } from 'zod';
import { TransactionStatus } from '@prisma/client';
import { PaymentService } from '../services/payment.service';
import { parseInput } from '../utils/validation';
import { getPagination, paginatedResult } from '../utils/pagination';
import { ApiError } from '../utils/errors';
import {
  serializePaymentDashboard,
  serializePaymentPublic,
} from '../utils/serializers';

const initializeSchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  amount: z.union([z.string(), z.number()]),
  currency: z.string().max(3).optional().default('NGN'),
  metadata: z.record(z.any()).optional(),
});

const referenceParams = z.object({
  reference: z.string().min(6).max(80),
});

const listSchema = z.object({
  status: z.nativeEnum(TransactionStatus).optional(),
  reference: z.string().max(100).optional(),
  email: z.string().max(254).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  initialize = async (req: Request, res: Response) => {
    const body = parseInput(initializeSchema, req.body);
    const result = await this.payments.initialize(body);
    res.status(201).json({ data: result });
  };

  verify = async (req: Request, res: Response) => {
    const { reference } = parseInput(referenceParams, req.params);
    const transaction = await this.payments.verify(reference);
    res.json({ data: serializePaymentPublic(transaction) });
  };

  getByReference = async (req: Request, res: Response) => {
    const { reference } = parseInput(referenceParams, req.params);
    const transaction = await this.payments.getByReference(reference);
    res.json({ data: serializePaymentPublic(transaction) });
  };

  list = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 20);
    const filters = parseInput(listSchema, req.query);
    const result = await this.payments.list({ ...pagination, ...filters });
    if (!result.items) {
      throw ApiError.notFound();
    }
    res.json(
      paginatedResult(result.items.map(serializePaymentDashboard), result.total, pagination),
    );
  };
}
