const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            popup: './src/popup/index.tsx',
            background: './src/background/service-worker.ts',
            content: './src/content/content-script.ts',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    use: 'babel-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.m?js/,
                    resolve: {
                        fullySpecified: false
                    }
                }
            ],
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
            alias: {
                '@': path.resolve(__dirname, 'src'),
                'process/browser': require.resolve('process/browser.js'),
            },
            fallback: {
                "path": require.resolve("path-browserify"),
                "stream": require.resolve("stream-browserify"),
                "crypto": require.resolve("crypto-browserify"),
                "buffer": require.resolve("buffer/"),
                "vm": require.resolve("vm-browserify"),
                "process": require.resolve("process/browser"),
                "fs": false
            }
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/popup/index.html',
                filename: 'popup.html',
                chunks: ['popup'],
            }),
            new CopyPlugin({
                patterns: [
                    { from: 'public/manifest.json', to: 'manifest.json' },
                    { from: 'public/icons', to: 'icons' },
                ],
            }),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser',
            }),
            new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
                resource.request = resource.request.replace(/^node:/, "");
            }),
        ],
        devtool: isProduction ? false : 'inline-source-map',
        optimization: {
            minimize: isProduction,
        },
    };
};
