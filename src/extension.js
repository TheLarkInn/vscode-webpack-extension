const {
  BCS,
  WLS,
  CDS
} = require("./events");
const {
  rehydrateFs
} = require("./fsUtils");
const vscode = require("vscode");
const LanguageClientDispatcher = require("./languageClientDispatcher");
const ModulesProvider = require("./treeviews/modulesProvider");

/** @typedef {import('webpack/lib/Compiler.js')} Compiler */
/** @typedef {import('webpack/lib/Stats.js')} Stats */
/** @typedef {(stats: Stats, compiler: Compiler) => void} CompilerCallback */

const {
  workspace,
  window: {
    showErrorMessage,
    showInformationMessage
  },
  commands: {
    registerCommand
  }
} = vscode;

let webpackLanguageClient;
let browserCoverageClient;
let webpackProductionClient;
let codeDeploymentClient;
let webhintDiagnosticClient;

let lastKnowGoodHash;
const defaultURI = "https://vscodesandbox.blob.core.windows.net";
let devBuildNotificationShown = false;

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = context => {
  const wlc = require("./servers/webpackLanguageClient");
  const bcc = require("./servers/browserCoverageClient");
  const wpc = require("./servers/webpackProductionClient");
  const cdc = require("./servers/codeDeploymentClient");
  const wdc = require("./servers/webhintDiagnosticClient.js");

  const deployStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  deployStatus.command = "extension.deploy";
  context.subscriptions.push(deployStatus);

  webpackLanguageClient = wlc.create(workspace, context);
  browserCoverageClient = bcc.create(workspace, context);
  webpackProductionClient = wpc.create(workspace, context);
  codeDeploymentClient = cdc.create(workspace, context);
  webhintDiagnosticClient = wdc.create(workspace, context);

  const dispatcher = new LanguageClientDispatcher(
    webpackLanguageClient,
    browserCoverageClient,
    codeDeploymentClient,
    webpackProductionClient,
    webhintDiagnosticClient
  );

  dispatcher.onNotification(WLS.WEBPACK_SERVE_STARTED, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_SERVE_STARTED, params);

    deployStatus.text = "Webpack build started";
    deployStatus.command = "";
    deployStatus.show();
  });

  dispatcher.onNotification(WLS.WEBPACK_SERVE_BUILD_ERROR, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_SERVE_BUILD_ERROR, params);

    vscode.window.showErrorMessage("Webpack build failed");
  });

  dispatcher.onNotification(WLS.WEBPACK_SERVE_BUILD_SUCCESS, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_SERVE_BUILD_SUCCESS, params);

    deployStatus.text = "Webpack build complete";

    // show a notification that the developer build is ready
    if (!this.devBuildNotificationShown) {
      this.devBuildNotificationShown = true;
      vscode.window.showInformationMessage(" 🏗 Developer build successful! 🏗", "View in Browser").then(selection => {
        if (selection === "View in Browser") {
          vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`http://localhost:8080`));
        }
      });
    }

    const {
      stats
    } = params;
    modulesProvider.refresh(stats.modules);
  });

  dispatcher.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_ERROR, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_CONFIG_PROD_BUILD_ERROR, params);
  });

  dispatcher.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, (params, issuer) => {
    dispatcher.dispatch(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, params);

    const fs = rehydrateFs(params.fs);
    console.log(fs.readdirSync(params.stats.outputPath));
    lastKnowGoodHash = params.stats.hash;
  });

  dispatcher.onNotification(BCS.BROWSER_COVERAGE_COLLECTED, params => {
    dispatcher.dispatch(BCS.BROWSER_COVERAGE_COLLECTED, params);

    console.log(params.coverage);
  });

  dispatcher.onNotification(CDS.CODE_DEPLOYMENT_SUCCESS, () => {
    dispatcher.dispatch(CDS.CODE_DEPLOYMENT_SUCCESS, {});

    deployStatus.text = "🚀 Production Deployment Complete 🚀";
    deployStatus.tooltip = "View in browser";
    deployStatus.command = "extension.deploy";
    deployStatus.show();
  });

  dispatcher.onNotification(CDS.CODE_DEPLOYMENT_ERROR, () => {
    dispatcher.dispatch(CDS.CODE_DEPLOYMENT_ERROR, {});

    vscode.window.showErrorMessage("Deployment failed");
  });

  dispatcher.startAll();
  // @ts-ignore
  const modulesProvider = new ModulesProvider(workspace, context, dispatcher);
  vscode.window.registerTreeDataProvider("builtModulesView", modulesProvider);
  vscode.window.createTreeView("builtModulesView", {
    treeDataProvider: modulesProvider
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.deploy", () => {
      if (lastKnowGoodHash !== undefined) {
        // open browser to lkg url
        console.log(`Open browser to ${defaultURI}/${lastKnowGoodHash}/index.html`);
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`${defaultURI}/${lastKnowGoodHash}/index.html`));
      }
    })
  );
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