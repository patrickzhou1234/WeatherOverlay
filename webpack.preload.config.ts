import path from 'path';
import type { Configuration } from 'webpack';

const config: Configuration = {
  entry: './src/renderer/preload.ts',
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'preload.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

export default config;
