import path from 'path';
import type { Configuration } from 'webpack';

const config: Configuration = {
  entry: './src/main/main.ts',
  target: 'electron-main',
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
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js',
  },
  externals: {
    // Keep native modules external — electron-builder bundles them
    'systeminformation': 'commonjs systeminformation',
    'electron-store': 'commonjs electron-store',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

export default config;
