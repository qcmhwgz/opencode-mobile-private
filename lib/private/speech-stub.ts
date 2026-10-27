const permissions = async () => ({ granted: false, canAskAgain: false, status: 'denied' });
export const ExpoSpeechRecognitionModule = {
  isRecognitionAvailable: () => false, supportsOnDeviceRecognition: () => false,
  getPermissionsAsync: permissions, requestPermissionsAsync: permissions,
  start: () => { throw new Error('Speech is disabled in Private Edition.'); },
  stop: () => {}, abort: () => {}, addListener: () => ({ remove: () => {} }),
};
export const useSpeechRecognitionEvent = () => {};
export const getAvailableVoicesAsync = async () => [];
export const stop = async () => {};
export const speak = () => { throw new Error('Speech is disabled in Private Edition.'); };
