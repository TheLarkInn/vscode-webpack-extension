const vscode = require("vscode");

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

let webpackLanguageClient;

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = context => {
  const { create } = require("./servers/webpackLanguageClient");
  webpackLanguageClient = create(workspace, context);
  webpackLanguageClient.start();
};

/**
 * @returns {Thenable<void>}
 */
const deactivate = () => {
  if (!webpackLanguageClient) {
    return undefined;
  } else {
    return webpackLanguageClient.stop();
  }
};

exports.activate = activate;
exports.deactivate = deactivate;
