import { createMachine, actions } from 'xstate';
import { message, Modal } from 'antd';
import { ipcRenderer, shell } from 'electron';
import path from 'path';

export default createMachine(
  {
    context: {
      biliURL: '',
      videoInfo: {},
      savePath: '',
      videoTitle: '',
      progressVideo: 0,
      progressAudio: 0,
    },
    id: 'bilibili download',
    on: {
      e_github: {
        actions: 'action_打开github',
      },
    },
    type: 'parallel',
    states: {
      操作区: {
        initial: '空闲',
        states: {
          空闲: {
            entry: 'action_初始化进度',
            on: {
              e_下载: [
                {
                  actions: 'action_无内容',
                  cond: 'cond_无内容',
                },
                {
                  target: '解析中',
                },
              ],
              e_输入地址: {
                actions: 'action_改变地址',
              },
            },
          },
          解析中: {
            invoke: {
              src: 'invoke_获取视频信息',
              onDone: [
                {
                  target: '选择下载位置',
                  actions: 'action_存储视频信息',
                },
              ],
              onError: [
                {
                  actions: 'action_解析错误',
                  target: '空闲',
                },
              ],
            },
          },
          选择下载位置: {
            invoke: {
              src: 'invoke_选择下载位置',
              onDone: {
                target: '下载中',
                actions: 'action_存储下载位置',
              },
              onError: {
                target: '空闲',
              },
            },
          },
          下载中: {
            invoke: {
              src: 'invoke_下载视频',
            },
            on: {
              e_下载完成: {
                target: '下载完成',
              },
              e_下载失败: {
                target: '下载失败',
              },
              e_进度更新: {
                actions: 'action_进度更新',
              },
            },
          },
          下载完成: {
            on: {
              e_打开目录: {
                actions: 'action_打开目录',
              },
              e_下载: [
                {
                  actions: 'action_无内容',
                  cond: 'cond_无内容',
                },
                {
                  target: '解析中',
                },
              ],
              e_输入地址: {
                actions: 'action_改变地址',
              },
            },
          },
          下载失败: {
            on: {
              e_下载: [
                {
                  actions: 'action_无内容',
                  cond: 'cond_无内容',
                },
                {
                  target: '解析中',
                },
              ],
              e_输入地址: {
                actions: 'action_改变地址',
              },
            },
          },
        },
      },
      后台区: {
        initial: '检测更新',
        states: {
          检测更新: {
            invoke: {
              src: 'invoke_检测更新',
            },
          },
        },
      },
    },
  },
  {
    guards: {
      cond_无内容: (context, event) => {
        return !context.biliURL;
      },
    },
    actions: {
      action_打开github: () => {
        shell.openExternal('https://github.com/lecepin/bilibili-download');
      },
      action_改变地址: actions.assign((context, event) => {
        return {
          biliURL: event.value,
        };
      }),
      action_无内容: actions.log(() => {
        message.error('请输入视频地址');
      }),
      action_解析错误: actions.log((context, event) => {
        message.error(event.data);
      }),
      action_存储视频信息: actions.assign((context, event) => {
        return {
          videoInfo: event.data,
          videoTitle: event.data?.title ?? Date.now(),
        };
      }),
      action_存储下载位置: actions.assign((context, event) => {
        return {
          savePath: event.data,
        };
      }),
      action_初始化进度: actions.assign((context, event) => {
        return {
          progressAudio: 0,
          progressVideo: 0,
        };
      }),
      action_进度更新: actions.assign((context, event) => {
        if (event.data.type === 'video') {
          return {
            progressVideo: ~~(event.data.data * 100),
          };
        } else if (event.data.type === 'audio') {
          return {
            progressAudio: ~~(event.data.data * 100),
          };
        }
      }),
      action_打开目录: actions.log((context, event) => {
        ipcRenderer.send('open-directory', context.savePath);
      }),
    },
    services: {
      invoke_获取视频信息: (context, event) => {
        ipcRenderer.send('get-video-info', context.biliURL);
        return new Promise((resolve, reject) => {
          ipcRenderer.once('get-video-info', (event, arg) => {
            if (arg.success) {
              resolve(arg.data);
            } else {
              reject(arg.data);
            }
          });
        });
      },
      invoke_选择下载位置: (context, event) => {
        ipcRenderer.send('get-save-info', context.videoTitle);

        return new Promise((resolve, reject) => {
          ipcRenderer.once('get-save-info', (event, arg) => {
            if (arg.success) {
              resolve(arg.data);
            } else {
              reject(arg.data);
            }
          });
        });
      },
      invoke_下载视频: (context, event) => send => {
        ipcRenderer.send('download-video', {
          videoUrl: context.videoInfo?.videoUrl,
          audioUrl: context.videoInfo?.audioUrl,
          title: path.join(context.savePath, context.videoTitle),
        });

        ipcRenderer.once('download-video', (event, arg) => {
          if (arg.success) {
            send('e_下载完成');
          } else {
            send('e_下载失败');
          }
        });

        ipcRenderer.on('download-progress', (event, arg) => {
          send({
            type: 'e_进度更新',
            data: arg,
          });
        });

        return () => {
          ipcRenderer.removeAllListeners('download-progress');
        };
      },
      invoke_检测更新: (context, event) => () => {
        ipcRenderer.send('get-update-info');
        ipcRenderer.once('get-update-info', (event, arg) => {
          if (arg.shouldUpdate) {
            Modal.confirm({
              title: '检测到新版本',
              content: '是否更新？',
              okText: '进入新版本下载页面',
              cancelText: '取消',
              onOk: () => {
                shell.openExternal('https://github.com/lecepin/bilibili-download/releases');
              },
            });
          }
        });
      },
    },
  },
);
