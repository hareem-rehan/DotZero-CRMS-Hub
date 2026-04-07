import { Request, Response, NextFunction } from 'express';

interface SafeParseResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: { flatten: () => { fieldErrors: Record<string, string[]> } };
}

interface ZodLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeParse(data: unknown): SafeParseResult;
}

export const validate =
  (schema: ZodLike, source: 'body' | 'params' | 'query' = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'Validation failed',
        meta: { issues: result.error?.flatten().fieldErrors },
      });
      return;
    }
    req[source] = result.data;
    next();
  };
