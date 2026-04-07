import { Request, Response, NextFunction } from 'express';
import * as crService from './changeRequests.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, status, changeType, priority, search, page, pageSize } = req.query;
    const result = await crService.listCRs(
      req.user?.userId as string,
      req.user?.role as string,
      {
        projectId: projectId as string | undefined,
        status: status as string | undefined,
        changeType: changeType as string | undefined,
        priority: priority as string | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      },
    );
    res.json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const detail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.getCRById(
      req.params['id'] as string,
      req.user?.userId as string,
      req.user?.role as string,
    );
    if (!cr) {
      res.status(404).json({ success: false, data: null, error: 'Change request not found', meta: null });
      return;
    }
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const cr = await crService.createCR(req.body, req.user?.userId as string, files);
    res.status(201).json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const cr = await crService.updateCR(
      req.params['id'] as string,
      req.body,
      req.user?.userId as string,
      req.user?.role as string,
      files,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.submitCR(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};
