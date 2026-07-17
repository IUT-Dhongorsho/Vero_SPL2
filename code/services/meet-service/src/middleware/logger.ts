import { Request, Response, NextFunction } from 'express';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    let emoji = '✅';
    if (statusCode >= 400 && statusCode < 500) emoji = '⚠️';
    if (statusCode >= 500) emoji = '❌';

    console.log(`${emoji} [${method}] ${originalUrl} — ${statusCode} (${duration}ms)`);
  });

  next();
};
