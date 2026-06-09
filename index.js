import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import AlarmModule from 'alarm-module';

import App from './App';

// Handle alarm triggers and dismiss from background/lockscreen
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.log("Background event received:", type);

  if (type === EventType.DELIVERED) {
    console.log("Alarm triggered! Playing alarm stream audio...");
    AlarmModule.playAlarm();
  } else if (
    (type === EventType.ACTION_PRESS && pressAction?.id === 'dismiss-alarm') ||
    type === EventType.DISMISSED ||
    type === EventType.PRESS
  ) {
    console.log("Stopping alarm stream audio...");
    AlarmModule.stopAlarm();
    await notifee.cancelNotification(notification.id);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
