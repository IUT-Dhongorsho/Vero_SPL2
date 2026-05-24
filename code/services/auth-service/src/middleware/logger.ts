import { Request, Response, NextFunction } from 'express';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Hook into the finish event to log after the response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    
    // Choose emoji based on status code
    let statusEmoji = '✅';
    if (statusCode >= 400 && statusCode < 500) statusEmoji = '⚠️';
    if (statusCode >= 500) statusEmoji = '❌';

    console.log(`${statusEmoji} [${method}] ${originalUrl} - ${statusCode} (${duration}ms)`);
  });

  next();
};
