import { Composition } from './types';

const STORAGE_KEY = 'musicgenerator.project';

export const saveProject = async (composition: Composition) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(composition));
    return true;
  } catch (error) {
    console.error('Save failed', error);
    return false;
  }
};

export const loadProject = async (): Promise<Composition | null> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Composition;
    return parsed;
  } catch (error) {
    console.error('Load failed', error);
    return null;
  }
};

export const clearProject = async () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Clear failed', error);
  }
};
