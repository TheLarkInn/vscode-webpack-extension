const { WLS } = require("./events");

const vscode = require("vscode");
const LanguageClientDispatcher = require("./languageClientDispatcher");

/** @typedef {import('webpack/lib/Compiler.js')} Compiler */
/** @typedef {import('webpack/lib/Stats.js')} Stats */
/** @typedef {(stats: Stats, compiler: Compiler) => void} CompilerCallback */

const {
  workspace,
  window: { showErrorMessage, showInformationMessage },
  commands: { registerCommand }
} = vscode;

let webpackLanguageClient;
let browserCoverageClient;
let codeDeploymentClient;

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = context => {
  const wlc = require("./servers/webpackLanguageClient");
  const bcc = require("./servers/browserCoverageClient");
  const cdc = require("./servers/codeDeploymentClient");

  webpackLanguageClient = wlc.create(workspace, context);
  browserCoverageClient = bcc.create(workspace, context);
  codeDeploymentClient = cdc.create(workspace, context);

  const dispatcher = new LanguageClientDispatcher(webpackLanguageClient, browserCoverageClient, codeDeploymentClient);
  dispatcher.onNotification(WLS.WEBPACK_SERVE_BUILD_SUCCESS, (params, issuer) => {
    const { stats } = params;

    console.log(params);
  });

  dispatcher.startAll();
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
