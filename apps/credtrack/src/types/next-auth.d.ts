import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

export type CredTrackPlan = 'STARTER' | 'GROWTH' | 'ENTERPRISE' | 'BUNDLED';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      /** null for SUPERADMIN / PLATFORM_ADMIN users without an agency */
      orgId: string | null;
      role: string;
      credtrackPlan: CredTrackPlan;
      isBundled: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    /** null for SUPERADMIN / PLATFORM_ADMIN users without an agency */
    orgId: string | null;
    role: string;
    credtrackPlan: CredTrackPlan;
    isBundled: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    orgId: string | null;
    role: string;
    credtrackPlan: CredTrackPlan;
    isBundled: boolean;
    orgStatusCheckedAt?: number;
  }
}
