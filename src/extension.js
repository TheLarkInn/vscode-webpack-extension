const { BCS, WLS, CDS } = require("./events");
const { rehydrateFs } = require("./fsUtils");
const vscode = require("vscode");
const LanguageClientDispatcher = require("./languageClientDispatcher");
const ModulesProvider = require("./treeviews/modulesProvider");

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
let webpackProductionClient;
let codeDeploymentClient;

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = context => {
  const wlc = require("./servers/webpackLanguageClient");
  const bcc = require("./servers/browserCoverageClient");
  const wpc = require("./servers/webpackProductionClient");
  const cdc = require("./servers/codeDeploymentClient");

  webpackLanguageClient = wlc.create(workspace, context);
  browserCoverageClient = bcc.create(workspace, context);
  webpackProductionClient = wpc.create(workspace, context);
  codeDeploymentClient = cdc.create(workspace, context);

  const dispatcher = new LanguageClientDispatcher(
    webpackLanguageClient,
    browserCoverageClient,
    codeDeploymentClient,
    webpackProductionClient
  );

  dispatcher.onNotification(WLS.WEBPACK_SERVE_BUILD_SUCCESS, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_SERVE_BUILD_SUCCESS, params);

    const { stats } = params;

    console.log(params);
  });

  dispatcher.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, params);

    const fs = rehydrateFs(params.fs);
    console.log(fs.readdirSync(params.stats.outputPath));
  });

  dispatcher.onNotification(BCS.BROWSER_COVERAGE_COLLECTED, params => {
    dispatcher.dispatch(BCS.BROWSER_COVERAGE_COLLECTED, params);

    console.log(params.coverage);
  });

  dispatcher.onNotification(CDS.CODE_DEPLOYMENT_SUCCESS, () => {
    dispatcher.dispatch(CDS.CODE_DEPLOYMENT_SUCCESS, {});

    console.log("Deploy Successful", arguments);
  });

  dispatcher.startAll();
  // @ts-ignore
  const modulesProvider = new ModulesProvider(workspace, context, dispatcher);
  vscode.window.registerTreeDataProvider("builtModulesView", modulesProvider);
  vscode.window.createTreeView("builtModulesView", { treeDataProvider: modulesProvider });
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
