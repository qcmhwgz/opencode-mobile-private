export const openAuthSessionAsync = async () => ({ type: 'cancel' });
export const openBrowserAsync = async () => { throw new Error('External browsing is disabled in Private Edition.'); };
export const maybeCompleteAuthSession = () => ({ type: 'dismiss' });
