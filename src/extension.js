const vscode = require("vscode");
const runWebpack = require("./runWebpack");
const serveWebpack = require("./serveWebpack");
const { getServeUrlFromOptions } = require("./serveUtils");

/** @typedef {import('webpack/lib/Compiler.js')} Compiler */
/** @typedef {import('webpack/lib/Stats.js')} Stats */

/**
 * @typedef {(stats: Stats, compiler: Compiler) => void} CompilerCallback
 */

const {
  workspace,
  window: { showErrorMessage, showInformationMessage },
  commands: { registerCommand }
} = vscode;

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = context => {
  const commands = {
    build: async () => {
      try {
        const results = await runWebpack(workspace);
        console.log(results);
      } catch (err) {
        showErrorMessage(err);
      }
    },
    serve: async () => {
      try {
        const server = await serveWebpack(workspace);
        server.on("listening", ({ server, options }) => {
          const url = getServeUrlFromOptions(options);
          showInformationMessage(`See your code live: ${url}`);

          console.log(server, options);
        });

        server.on("build-finished", onBuildFinished);
        server.on("compiler-error", onCompilerError);
        server.on("compiler-warning", onCompilerWarning);
      } catch (err) {
        showErrorMessage(err);
      }
    }
  };

  /** @type {CompilerCallback} */
  const onBuildFinished = (stats, compiler) => {
    console.log("Rebuilt!");
    // showInformationMessage("Rebuilt!");
  };
  /** @type {CompilerCallback} */
  const onCompilerWarning = (stats, compiler) => {
    showErrorMessage("Warning!");
  };
  /** @type {CompilerCallback} */
  const onCompilerError = (stats, compiler) => {
    showErrorMessage("Error!");
  };

  let buildDisposable = registerCommand("extension.webpackBuild", commands.build);
  let serveDisposable = registerCommand("extension.webpackServe", commands.serve);

  context.subscriptions.push(buildDisposable, serveDisposable);

  commands.serve();
};

exports.activate = activate;
