const axios = require('axios');
const fs = require('fs');
const os = require('os');
const child_process = require('child_process');
const { APP_CONFIG_TOOL_PATH } = require('./const');

function downloadBFile(url, fullFileName, progressCallback) {
  return axios
    .get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        referer: 'https://www.bilibili.com',
      },
    })
    .then(({ data, headers }) => {
      let currentLen = 0;
      const totalLen = headers['content-length'];

      return new Promise((resolve, reject) => {
        data.on('data', ({ length }) => {
          currentLen += length;
          progressCallback?.(currentLen / totalLen);
        });

        data.pipe(
          fs.createWriteStream(fullFileName).on('finish', () => {
            resolve({
              fullFileName,
              totalLen,
            });
          }),
        );
      });
    });
}

function getDonwloadUrl(url) {
  return axios
    .get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        referer: 'https://www.bilibili.com',
      },
    })
    .then(({ data }) => {
      const info = JSON.parse(
        data.match(/<script>window\.__playinfo__=({.*})<\/script><script>/)?.[1],
      );
      const videoUrl =
        info?.data?.dash?.video?.[0]?.baseUrl ?? info?.data?.dash?.video?.[0]?.backupUrl?.[0];
      const audioUrl =
        info?.data?.dash?.audio?.[0]?.baseUrl ?? info?.data?.dash?.audio?.[0]?.backupUrl?.[0];
      const title = data.match(/title="(.*?)"/)?.[1]?.replaceAll?.(/\\|\/|:|\*|\?|"|<|>|\|/g, '');

      if (videoUrl && audioUrl) {
        return { videoUrl, audioUrl, title };
      }

      return Promise.reject('获取下载地址失败');
    });
}

function mergeFileToMp4(vFullFileName, aFullFileName, outputFileName, shouldDelete = true) {
  let cmd = 'ffmpeg';
  const env = {
    ...process.env,
    PATH: '/usr/local/bin:' + child_process.execSync('echo $PATH').toString(),
  };

  if (os.platform() == 'win32') {
    cmd = APP_CONFIG_TOOL_PATH;
  }

  return new Promise((resolve, reject) => {
    child_process.exec(
      `${cmd} -y -i "${vFullFileName}" -i "${aFullFileName}" -c copy "${outputFileName}"`,
      { env },
      err => {
        if (shouldDelete) {
          fs.unlink(vFullFileName, f => f);
          fs.unlink(aFullFileName, f => f);
        }

        if (err) {
          reject(err);
        }

        resolve({ outputFileName });
      },
    );
  });
}

module.exports = { downloadBFile, getDonwloadUrl, mergeFileToMp4 };
