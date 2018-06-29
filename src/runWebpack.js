const path = require("path");
const webpack = require("webpack");
const webpackMerge = require("webpack-merge");

const config = require("./webpack.config");

const run = async (userWorkspace, mode = "production", overrideConfig = {}) => {
  const context = path.resolve(userWorkspace.rootPath);
  const compilerOptions = webpackMerge({ context, mode }, config, overrideConfig);
  const compiler = webpack(compilerOptions);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
};

module.exports = run;
