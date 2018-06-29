const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  plugins: [new webpack.ProgressPlugin(), new HtmlWebpackPlugin()]
};
