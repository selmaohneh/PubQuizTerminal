'use client';

import { useEffect } from 'react';

// The room/game logic lives in framework-free scripts under /public (shared
// history with the Electron app, driven by integration tests). This component
// loads them in order and boots the page's controller class.
const loadedScripts = new Set();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (loadedScripts.has(src)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`Script konnte nicht geladen werden: ${src}`));
    document.body.appendChild(script);
  });
}

export default function ControllerBoot({ scripts, controller }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of scripts) {
        await loadScript(src);
      }
      if (!cancelled) {
        new window[controller]();
      }
    })().catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
    // scripts/controller are static per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
