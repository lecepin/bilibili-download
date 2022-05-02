const { ipcMain, app, dialog, shell } = require('electron');
const { getDonwloadUrl, downloadBFile, mergeFileToMp4 } = require('./utils');
const path = require('path');
const { throttle } = require('lodash');

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
          data: '解析失败，请重试一下',
        });
      });
  });

  ipcMain.on('get-save-info', (event, arg) => {
    dialog
      .showOpenDialog({
        title: '保存',
        properties: ['openDirectory'],
      })
      .then(result => {
        event.reply('get-save-info', {
          success: !result.canceled,
          data: result.filePaths?.[0],
        });
      });
  });

  ipcMain.on('download-video', (event, { title, videoUrl, audioUrl }) => {
    Promise.all([
      downloadBFile(
        videoUrl,
        title + '-video.m4s',
        throttle(
          value =>
            event.reply('download-progress', {
              type: 'video',
              data: value,
            }),
          1000,
        ),
      ),
      downloadBFile(
        audioUrl,
        title + '-audio.m4s',
        throttle(
          value =>
            event.reply('download-progress', {
              type: 'audio',
              data: value,
            }),
          1000,
        ),
      ),
    ])
      .then(data => {
        return mergeFileToMp4(data[0].fullFileName, data[1].fullFileName, title + '.mp4');
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
    shell.openPath(arg);
  });

  app.on('before-quit', () => {});
};
module.exports = initIPC;
