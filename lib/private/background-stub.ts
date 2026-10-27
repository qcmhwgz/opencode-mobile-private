export const BackgroundTaskStatus = { Available: 1, Restricted: 2 };
export const BackgroundTaskResult = { Success: 1, Failed: 2 };
export const getStatusAsync = async () => BackgroundTaskStatus.Restricted;
export const registerTaskAsync = async () => {};
export const defineTask = () => {};
export const isTaskDefined = () => false;
export const isTaskRegisteredAsync = async () => false;
