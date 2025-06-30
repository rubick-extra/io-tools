import { uIOhook } from 'uiohook-napi';

let contexts: any[] = [];

module.exports = () => {
  return {  
    async onReady(ctx: any) {
      const { ipcMain } = ctx;
      uIOhook.on('keydown', (e) => {
        ipcMain.emit('iohook', e);
        contexts.forEach((context) => {
          if (context.isDestroyed()) {
            contexts = contexts.filter((c) => c !== context);
            return;
          }
          context.send('iohook', e);
        });
      });
      uIOhook.on('keyup', (e) => {  
        ipcMain.emit('iohook', e);
        contexts.forEach((context) => {
          if (context.isDestroyed()) {
            contexts = contexts.filter((c) => c !== context);
            return;
          }
          context.send('iohook', e);
        });
      });
      uIOhook.on('mousedown', (e) => {
        ipcMain.emit('iohook', e);
        contexts.forEach((context) => {
          if (context.isDestroyed()) {
            contexts = contexts.filter((c) => c !== context);
            return;
          }
          context.send('iohook', e);
        });
      });
      uIOhook.on('mouseup', (e) => {
        ipcMain.emit('iohook', e);
        contexts.forEach((context) => {
          if (context.isDestroyed()) {
            contexts = contexts.filter((c) => c !== context);
            return;
          }
          context.send('iohook', e);
        });
      });
      uIOhook.start();

      ipcMain.on('iohook-listen', ({ sender }: any) => {
        if (contexts.includes(sender)) {
          return;
        }
        contexts.push(sender);
      });
      ipcMain.on('iohook-unlisten', ({ sender }: any) => {
        contexts = contexts.filter((context) => context !== sender);
      });
    }
  };
};
