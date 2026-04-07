import { Request, Response, NextFunction } from 'express';
import * as invitationsService from './invitations.service';

export const send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await invitationsService.sendInvitation(req.body, req.user?.userId as string);
    res.status(201).json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitations = await invitationsService.listInvitations(
      req.query['projectId'] as string | undefined,
    );
    res.json({ success: true, data: invitations, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};
