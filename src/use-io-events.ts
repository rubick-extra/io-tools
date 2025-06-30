import { ipcRenderer } from 'electron';
import { useIOShortcutRecorder } from './use-io-shortcut';

function useIOEvents() {
  let handlers: ((event: any) => any)[] = [];

  ipcRenderer.on('iohook', (e: any, data: any) => {
    handlers.forEach((handler) => {
      handler(data);
    });
  });

  return {
    on(handler: (event: any) => any) {
      handlers.push(handler);
      ipcRenderer.send('iohook-listen');
    },
    off(handler: (event: any) => any) {
      handlers = handlers.filter((h) => h !== handler);
      if (handlers.length === 0) {
        ipcRenderer.send('iohook-unlisten');
      }
    }
  }
}

(globalThis as any).useIOEvents = useIOEvents;
(globalThis as any).useIOShortcutRecorder = useIOShortcutRecorder;

