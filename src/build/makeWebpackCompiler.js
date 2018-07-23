const path = require("path");
const webpack = require("webpack");
const webpackMerge = require("webpack-merge");
const defaultConfig = require("./webpack.config");

/** @typedef {import("webpack/lib/Compiler")} Compiler */
/** @typedef {import("webpack")} WebpackConfig */

/**
 * @param {string} contextPath
 * @param {"production"|"development"|"none"} mode
 * @returns {{compiler: Compiler, config: WebpackConfig}}
 */
const makeWebpackCompiler = (contextPath, mode) => {
  let config;
  const context = path.resolve(contextPath);
  const configFile = path.join(context, "webpack.config.js");

  try {
    config = require(configFile);
    /**
     * This allows us to recieve changes from the
     * config insteaed of pulling existing config
     * from require cache.
     */
    delete require.cache[require.resolve(configFile)];
  } catch (error) {
    /**
     * If we can't find the users config, lets swallow it and then
     * pass in our own sane default that supports some generic functionality
     */
    console.info("Cannot find user's webpack configuration in workspace.\n Falling back to default extension options", error);
    config = require("./webpack.config");
  }

  /**
   * If the config is a function that returns a config
   * let's at the least pass in the env (in this case {mode})
   */
  if (typeof config === "function") {
    config = config({ mode });
    console.log(config);
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
