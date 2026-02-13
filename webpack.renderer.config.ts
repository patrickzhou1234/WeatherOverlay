import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

interface WebpackDevConfig extends Configuration {
  devServer?: DevServerConfiguration;
}

const config: WebpackDevConfig = {
  entry: './src/renderer/index.tsx',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(glsl|vert|frag)$/,
        use: 'raw-loader',
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'renderer.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    }),
    // Polyfill Node's "global" for packages that reference it
    new webpack.DefinePlugin({
      global: 'globalThis',
    }),
  ],
  devServer: {
    port: 9000,
    hot: true,
    static: {
      directory: path.resolve(__dirname, 'dist/renderer'),
    },
  },
};

export default config;
