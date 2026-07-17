import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.format(),
      });
      return;
    }
    req.body = result.data as typeof req.body;
    next();
  };
}
