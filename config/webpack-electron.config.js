const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, '../src/electron/main.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, '../dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: require.resolve("babel-loader"),
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-env'],
        },
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },
  target: 'electron-main',
  node: {
    __dirname: false,
  },
};
