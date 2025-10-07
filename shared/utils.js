export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

export function getFileExtension(filePath) {
  const path = require('path');
  return path.extname(filePath).toLowerCase();
}

export function isElectronEnvironment() {
  return typeof require !== 'undefined' && typeof window !== 'undefined';
}

export function getElectronModules() {
  if (!isElectronEnvironment()) {
    return { ipcRenderer: null, fs: null, path: null };
  }

  try {
    const { ipcRenderer } = require('electron');
    const fs = require('fs');
    const path = require('path');
    return { ipcRenderer, fs, path };
  } catch (error) {
    console.error('Failed to load Electron modules:', error);
    return { ipcRenderer: null, fs: null, path: null };
  }
}
