const path = require("path");
const webpackServe = require("webpack-serve");
const webpackMerge = require("webpack-merge");
const config = require("./webpack.config");

const serve = async (userWorkspace, mode = "development", overrideConfig = {}) => {
  const context = path.resolve(userWorkspace.rootPath);
  const modules = ["node_modules", path.resolve(context, "../node_modules"), path.resolve(__dirname, "../node_modules")];
  const compilerOptions = webpackMerge({ context, mode, resolve: { modules }, resolveLoader: { modules } }, config, overrideConfig);

  return webpackServe({ config: compilerOptions });
};

module.exports = serve;
