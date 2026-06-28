import { Request, Response, NextFunction } from 'express';
import * as crService from './changeRequests.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, status, changeType, priority, search, page, pageSize, assignedToMe, initiatedByDm } = req.query;
    const result = await crService.listCRs(req.user?.userId as string, req.user?.role as string, {
      projectId: projectId as string | undefined,
      status: status as string | undefined,
      changeType: changeType as string | undefined,
      priority: priority as string | undefined,
      search: search as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      assignedToMe: assignedToMe === 'true',
      initiatedByDm: initiatedByDm === 'true' ? true : initiatedByDm === 'false' ? false : undefined,
    });
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
      res
        .status(404)
        .json({ success: false, data: null, error: 'Change request not found', meta: null });
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
    const cr = await crService.submitCR(req.params['id'] as string, req.user?.userId as string);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { poSignature, approvalNotes } = req.body;
    const cr = await crService.approveCR(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      poSignature,
      approvalNotes,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const decline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { declineNotes } = req.body;
    const cr = await crService.declineCR(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      declineNotes,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const defer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { deferReason } = req.body;
    const cr = await crService.deferCR(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      deferReason,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const resubmit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.resubmitCR(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    const cr = await crService.cancelCR(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      reason,
    );
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const versions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await crService.getCRVersions(
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
    );
    res.json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

// ─── DM-initiated flow ────────────────────────────────────────────────────────

export const createDMInitiated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.createDMInitiatedCR(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const dmEditDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.updateDMDraft(req.params['id'] as string, req.body, req.user!.userId);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const sendToClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.sendToClient(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const clientConfirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.clientConfirmCR(req.params['id'] as string, req.user!.userId, req.body);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const clientReviewEdit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.clientReviewEditCR(req.params['id'] as string, req.user!.userId, req.body);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const clientReject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.clientRejectCR(req.params['id'] as string, req.user!.userId, req.body);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const poResubmitWithEdits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.poResubmitWithEdits(req.params['id'] as string, req.user!.userId, req.body);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const dmReviewResubmit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.dmReviewResubmit(req.params['id'] as string, req.user!.userId, req.body);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const markInProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.markInProgress(req.params['id'] as string, req.user!.userId, req.user!.role);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const markCompleted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.markCompleted(req.params['id'] as string, req.user!.userId, req.user!.role);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const recallFromClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cr = await crService.recallFromClient(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: cr, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};
