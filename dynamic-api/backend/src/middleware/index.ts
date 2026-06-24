import { Request, Response, NextFunction } from 'express';
import { authService, apiKeyService } from '../services';
import { JwtPayload, Permission } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

async function resolveAuth(req: AuthenticatedRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  if (apiKeyHeader) {
    return apiKeyService.authenticate(apiKeyHeader);
  }

  if (authHeader?.startsWith('ApiKey ')) {
    return apiKeyService.authenticate(authHeader.slice(7).trim());
  }

  if (authHeader?.startsWith('Bearer ')) {
    try {
      return authService.verifyAccessToken(authHeader.slice(7));
    } catch {
      return null;
    }
  }

  return null;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  void resolveAuth(req).then((user) => {
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    req.user = user;
    next();
  });
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  void resolveAuth(req).then((user) => {
    if (user) req.user = user;
    next();
  });
}

export function requirePermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const hasPermission = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
      return;
    }

    next();
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
