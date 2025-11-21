import { Injectable, Logger } from '@nestjs/common';
import {
  ServiceAccount,
  cert,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import serviceAccount from '../../serviceAccountKey.json';

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private readonly app = this.ensureInitialized();

  /**
   * Ensure Firebase Admin is initialized exactly once across the process.
   */
  private ensureInitialized() {
    if (!getApps().length) {
      this.logger.log('Initializing Firebase Admin app');
      return initializeApp({
        credential: cert(serviceAccount as ServiceAccount),
      });
    }
    return getApp();
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    return getAuth(this.app).verifyIdToken(idToken);
  }
}
