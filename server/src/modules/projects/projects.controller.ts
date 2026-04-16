import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, search, clientName, page, pageSize } = req.query;
    const result = await projectsService.listProjects({
      status: status as string | undefined,
      search: search as string | undefined,
      clientName: clientName as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, data: result, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const clientNames = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const names = await projectsService.getClientNames();
    res.json({ success: true, data: names, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const detail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await projectsService.getProjectById(req.params['id'] as string);
    if (!project) {
      res.status(404).json({ success: false, data: null, error: 'Project not found', meta: null });
      return;
    }
    res.json({ success: true, data: project, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const actorId = req.user?.userId as string;
    const project = await projectsService.createProject(req.body, actorId, files);
    res.status(201).json({ success: true, data: project, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const actorId = req.user?.userId as string;
    const project = await projectsService.updateProject(
      req.params['id'] as string,
      req.body,
      actorId,
      files,
    );
    res.json({ success: true, data: project, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await projectsService.archiveProject(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    res.json({ success: true, data: project, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const unarchive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await projectsService.unarchiveProject(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    res.json({ success: true, data: project, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await projectsService.deleteProject(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: null, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const clientLoginLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const links = await projectsService.generateClientLoginLinks(
      req.params['id'] as string,
      req.user?.userId as string,
    );
    res.json({ success: true, data: links, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const myProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projects = await projectsService.getMyProjects(req.user!.userId);
    res.json({ success: true, data: projects, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};

export const dmDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await projectsService.getDmDropdownUsers();
    res.json({ success: true, data: users, error: null, meta: null });
  } catch (err) {
    next(err);
  }
};
