import type { ApiCredential, Session, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      id: string;
      rawBody?: Buffer;
      auth?: {
        type: 'session' | 'apiKey';
        user: User;
        session?: Session;
        credential?: ApiCredential;
      };
    }
  }
}

export {};
