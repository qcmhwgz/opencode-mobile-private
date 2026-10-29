export const AndroidImportance = { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 };
export const getPermissionsAsync = async () => ({ granted: false, status: 'denied', canAskAgain: false });
export const requestPermissionsAsync = getPermissionsAsync;
export const setNotificationHandler = () => {};
export const setNotificationChannelAsync = async () => null;
export const scheduleNotificationAsync = async () => '';
// RootNavigator mounts the notification route on Android even when notifications
// are disabled. Preserve its subscription lifecycle without native listeners.
export const addNotificationResponseReceivedListener = () => ({ remove: () => {} });
export const getLastNotificationResponseAsync = async () => null;
