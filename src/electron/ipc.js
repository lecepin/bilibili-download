const { ipcMain, app, dialog, shell } = require('electron');
const spawn = require('cross-spawn');
const child_process = require('child_process');
const { APP_CONFIG_TOOL_PATH } = require('./const');
const { getDonwloadUrl, downloadBFile, mergeFileToMp4 } = require('./utils');
const os = require('os');
const path = require('path');

let lastChildProcess;

const initIPC = () => {
  ipcMain.on('get-video-info', (event, arg) => {
    getDonwloadUrl(arg)
      .then(data => {
        event.reply('get-video-info', {
          success: true,
          data,
        });
      })
      .catch(err => {
        event.reply('get-video-info', {
          success: false,
          data: '解析失败',
        });
      });
  });

  ipcMain.on('get-save-info', (event, arg) => {
    dialog
      .showSaveDialog({
        title: '保存',
        defaultPath: arg,
        filters: [{ name: 'MP4', extensions: ['mp4'] }],
      })
      .then(result => {
        event.reply('get-save-info', {
          success: !result.canceled,
          data: result.filePath,
        });
      });
  });

  ipcMain.on('download-video', (event, { title, videoUrl, audioUrl }) => {
    Promise.all([
      downloadBFile(videoUrl, title + '-video.m4s', value =>
        event.reply('download-progress', {
          type: 'video',
          data: value,
        }),
      ),
      downloadBFile(audioUrl, title + '-audio.m4s', value =>
        event.reply('download-progress', {
          type: 'audio',
          data: value,
        }),
      ),
    ])
      .then(data => {
        return mergeFileToMp4(data[0].fullFileName, data[1].fullFileName, title);
      })
      .then(data => {
        event.reply('download-video', {
          success: true,
        });
      })
      .catch(data => {
        event.reply('download-video', {
          success: false,
        });
      });
  });

  ipcMain.on('open-directory', (event, arg) => {
    shell.openPath(path.dirname(arg));
  });

  app.on('before-quit', () => {
    lastChildProcess && lastChildProcess.kill();
  });
};
module.exports = initIPC;
