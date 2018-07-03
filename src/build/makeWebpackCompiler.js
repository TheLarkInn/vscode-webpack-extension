const path = require("path");
const webpack = require("webpack");
const webpackMerge = require("webpack-merge");
const defaultConfig = require("./webpack.config");

/**
 *
 * @param {string} contextPath
 * @param {"production"|"development"|"none"} mode
 */
const makeWebpackCompiler = (contextPath, mode) => {
  let config;
  const context = path.resolve(contextPath);
  const configFile = path.join(context, "webpack.config.js");
  try {
    config = require(configFile);
    delete require.cache[require.resolve(configFile)];
  } catch (error) {
    console.info("Cannot find user's webpack configuration in workspace.\n Falling back to default extension options");
    config = require("./webpack.config");
  }

  const modules = ["node_modules", path.resolve(context, "../node_modules"), path.resolve(__dirname, "../../node_modules")];
  const compilerOptions = webpackMerge(defaultConfig, config, {
    context,
    mode,
    watch: mode === "development",
    resolve: { modules },
    resolveLoader: { modules }
  });

  return { compiler: webpack(compilerOptions), config: compilerOptions };
};

module.exports = makeWebpackCompiler;
