import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, isActive, search, page, pageSize } = req.query;
    const result = await usersService.listUsers({
      role: role as string | undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const detail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.getUserById(req.params['id'] as string);
    if (!user) {
      res.status(404).json({ success: false, data: null, error: 'User not found', meta: null });
      return;
    }
    res.json({ success: true, data: user, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.createUser(req.body, req.user?.userId as string);
    res.status(201).json({ success: true, data: user, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.updateUser(
      req.params['id'] as string,
      req.body,
      req.user?.userId as string,
    );
    res.json({ success: true, data: user, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const deactivate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.setUserActive(
      req.params['id'] as string,
      false,
      req.user?.userId as string,
    );
    res.json({ success: true, data: user, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const reactivate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.setUserActive(
      req.params['id'] as string,
      true,
      req.user?.userId as string,
    );
    res.json({ success: true, data: user, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const resendWelcome = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await usersService.resendWelcomeEmail(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    res.json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await usersService.adminResetPassword(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    res.json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};
