const { ipcMain, app, dialog, shell } = require('electron');
const spawn = require('cross-spawn');
const child_process = require('child_process');
const { APP_CONFIG_TOOL_PATH } = require('./const');
const { getDonwloadUrl, downloadBFile, mergeFileToMp4 } = require('./utils');
const os = require('os');
const path = require('path');

let lastChildProcess;

const initIPC = () => {
  ipcMain.on('merge-merge', (event, arg) => {
    if (lastChildProcess) {
      lastChildProcess.kill();
      lastChildProcess = null;
    }

    let cmd = 'ffmpeg';
    let env = {
      ...process.env,
      PATH: '/usr/local/bin:' + child_process.execSync('echo $PATH').toString(),
    };

    if (os.platform() == 'win32') {
      cmd = APP_CONFIG_TOOL_PATH;
    }

    lastChildProcess = spawn(cmd, ['-y', '-i', `concat:${arg.input}`, '-c', 'copy', arg.output], {
      env: env,
    });

    lastChildProcess.stdout.on('data', data => {
      event.reply('merge-merge-result', {
        type: 'stdout',
        data: data.toString(),
      });
    });
    lastChildProcess.stderr.on('data', data => {
      event.reply('merge-merge-result', {
        type: 'stderr',
        data: data.toString(),
      });
    });
    lastChildProcess.on('error', data => {
      event.reply('merge-merge-result', {
        type: 'err',
        data: data.toString(),
      });
    });
  });

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
    // shell.openPath(path.dirname(arg));
    shell.openPath(arg);
  });

  app.on('before-quit', () => {
    lastChildProcess && lastChildProcess.kill();
  });
};
module.exports = initIPC;
