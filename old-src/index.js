const path = require('path');
const { getDonwloadUrl, downloadBFile, mergeFileToMp4 } = require('./utils');

getDonwloadUrl(
  'https://www.bilibili.com/bangumi/play/ep477095',
)
  .then(({ videoUrl, audioUrl, title = Date.now() }) => {
    console.log({ videoUrl, audioUrl, title });

    Promise.all([
      downloadBFile(videoUrl, path.join(__dirname, 'out', title + '-video.m4s')),
      downloadBFile(audioUrl, path.join(__dirname, 'out', title + '-audio.m4s')),
    ])
      .then(data => {
        return mergeFileToMp4(
          data[0].fullFileName,
          data[1].fullFileName,
          path.join(__dirname, 'out', title + '.mp4'),
        );
      })
      .then(data => {
        console.log('执行完成', data);
      });
  })
  .catch(err => {
    console.log('执行失败', err);
  });
