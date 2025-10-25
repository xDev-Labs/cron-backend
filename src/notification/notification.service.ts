import {  Injectable } from '@nestjs/common';

import {
  Expo, 
  type ExpoPushMessage, 
  type ExpoPushTicket
} from "expo-server-sdk";



@Injectable()
export class NotificationService {
    
  static async pushNotify(data: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    });
    const responses = await expo.sendPushNotificationsAsync(data);
    return responses;
  }
}
