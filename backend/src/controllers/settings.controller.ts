import type { Request, Response } from 'express';
import { getSettings } from '../services/settings.service';

export class SettingsController {
  public = async (_req: Request, res: Response) => {
    const settings = await getSettings();
    res.json({ data: settings });
  };
}
