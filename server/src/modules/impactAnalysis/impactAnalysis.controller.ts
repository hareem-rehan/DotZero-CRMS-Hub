import { Request, Response, NextFunction } from 'express';
import { saveImpactAnalysis } from './impactAnalysis.service';
import { addInternalNote } from '../changeRequests/changeRequests.service';

export const impactAnalysisController = {
  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const { estimatedHours, timelineImpact, affectedDeliverables, revisedMilestones, resourcesRequired, recommendation, dmSignature, isDraft } = req.body;
      const analysis = await saveImpactAnalysis(id, req.user!.userId, {
        estimatedHours: Number(estimatedHours),
        timelineImpact,
        affectedDeliverables,
        revisedMilestones,
        resourcesRequired,
        recommendation,
        dmSignature,
        isDraft: isDraft === true || isDraft === 'true',
      });
      res.json({ success: true, data: analysis, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const { content } = req.body;
      const note = await addInternalNote(id, req.user!.userId, req.user!.role, content);
      res.status(201).json({ success: true, data: note, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
};
