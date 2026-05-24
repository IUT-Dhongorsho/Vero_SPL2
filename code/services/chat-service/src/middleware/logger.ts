import { Request, Response, NextFunction } from 'express';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    
    let statusEmoji = '✅';
    if (statusCode >= 400 && statusCode < 500) statusEmoji = '⚠️';
    if (statusCode >= 500) statusEmoji = '❌';

    console.log(`${statusEmoji} [${method}] ${originalUrl} - ${statusCode} (${duration}ms)`);
  });

  next();
};
