import { Request, Response, NextFunction } from 'express';
import * as invitationsService from './invitations.service';
import { env } from '../../config/env';

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
    // Attach the magic link to each invitation so SA can copy it directly
    const withLinks = invitations.map((inv) => ({
      ...inv,
      magicLink: inv.usedAt ? null : `${env.CLIENT_URL}/register?token=${inv.token}`,
    }));
    res.json({ success: true, data: withLinks, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const resend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await invitationsService.resendInvitation(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    const magicLink = `${env.CLIENT_URL}/register?token=${result.token}`;
    res.json({ success: true, data: { message: result.message, magicLink }, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};
