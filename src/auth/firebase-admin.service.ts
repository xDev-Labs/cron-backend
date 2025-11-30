import { Injectable, Logger } from '@nestjs/common';
import {
  ServiceAccount,
  cert,
  getApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';



@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private readonly app = this.ensureInitialized();

  /**
   * Ensure Firebase Admin is initialized exactly once across the process.
   */
  private ensureInitialized() {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );
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
