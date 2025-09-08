import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
}

class NotificationService {
  private pushToken: string | null = null;

  /**
   * Request notification permissions and get push token
   */
  async registerForPushNotifications(): Promise<PushToken | null> {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        // First try to get token with project ID if available
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        
        if (projectId) {
          token = (await Notifications.getExpoPushTokenAsync({
            projectId,
          })).data;
        } else {
          // Fallback: try to get token without explicit project ID (for development)
          console.log('No project ID found, attempting to get token without it...');
          token = (await Notifications.getExpoPushTokenAsync()).data;
        }
        
        this.pushToken = token;
        console.log('Push token obtained:', token);
        
        return {
          token,
          type: 'expo'
        };
      } catch (error) {
        console.error('Error getting push token:', error);
        
        // For development/testing, create a mock token
        if (__DEV__) {
          console.log('Development mode: creating mock push token');
          const mockToken = `ExponentPushToken[mock-${Date.now()}]`;
          this.pushToken = mockToken;
          
          return {
            token: mockToken,
            type: 'expo'
          };
        }
        
        return null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
      return null;
    }
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    // Listener for when notification is received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });

    // Return cleanup function
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, seconds: number = 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'local' },
      },
      trigger: { seconds } as any,
    });
  }

  /**
   * Cancel all scheduled local notifications
   */
  async cancelAllLocalNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }
}

export default new NotificationService();