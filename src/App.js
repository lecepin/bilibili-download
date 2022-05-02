import React from 'react';
import { Space, Select, Input, Button, Divider, Progress, Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
  GithubFilled,
} from '@ant-design/icons';
import { useMachine } from '@xstate/react';
import fsm from './fsm';
import imgLogo from './logo.png';

import './App.less';

export default () => {
  const [state, send] = useMachine(fsm);
  const { biliURL, videoTitle, savePath, progressAudio, progressVideo } = state.context;
  const disabledTopbar = !['操作区.空闲', '操作区.下载完成', '操作区.下载失败'].some(state.matches);

  return (
    <div className="App">
      <Space className="App-topbar">
        <span>类型</span>
        <Select value="currentVideo" disabled={disabledTopbar}>
          <Select.Option key="currentVideo">下载当前视频</Select.Option>
        </Select>
        <Input
          placeholder="请输入B站视频地址"
          disabled={disabledTopbar}
          value={biliURL}
          onChange={({ target }) => {
            send({ type: 'e_输入地址', value: target.value });
          }}
        ></Input>
        <Button type="primary" loading={disabledTopbar} onClick={() => send('e_下载')}>
          下载视频
        </Button>
      </Space>

      {state.matches('操作区.下载中') ? (
        <>
          <Divider />
          <div>正在下载：{videoTitle}</div>
          <div>保存位置：{savePath}</div>
          <div className="App-progress">
            <span>音频</span>
            <Progress percent={progressAudio} />
          </div>
          <div className="App-progress">
            <span>视频</span>
            <Progress percent={progressVideo} />
          </div>
        </>
      ) : null}

      {state.matches('操作区.下载完成') ? (
        <>
          <Divider />
          <div className="App-result">
            <Tag icon={<CheckCircleOutlined />} color="success"></Tag>
            <span>{videoTitle}</span>
            <Button icon={<FolderOpenOutlined />} size="small" onClick={() => send('e_打开目录')}>
              打开目录
            </Button>
          </div>
        </>
      ) : null}

      {state.matches('操作区.下载失败') ? (
        <div className="App-result">
          <Tag icon={<CloseCircleOutlined />} color="error"></Tag>
          <span>下载失败：风月 ❀ 只做你心心念念的江南佳人</span>
        </div>
      ) : null}

      <div className="App-logo">
        <img src={imgLogo} />
        <Button icon={<GithubFilled />} size="large" onClick={() => send('e_github')}>
          <b> Star</b>
        </Button>
      </div>
    </div>
  );
};
