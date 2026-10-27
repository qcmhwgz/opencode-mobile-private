export const isAvailableAsync = async () => false;
export const shareAsync = async () => { throw new Error('External sharing is disabled in Private Edition.'); };
export const getSharedPayloads = () => [];
export const getResolvedSharedPayloadsAsync = async () => [];
export const clearSharedPayloads = () => {};
