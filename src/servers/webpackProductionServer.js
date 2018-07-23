const webpack = require("webpack");
const webpackMerge = require("webpack-merge");
const fs = require("../fs.js");

const makeWebpackCompiler = require("../build/makeWebpackCompiler");
const { WLS } = require("../events");

const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");

/** @typedef {import("webpack/lib/Compiler")} Compiler */

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

/** @type {string=} */
let workspacePath;
/** @type {string=} */
let workspaceUri;
let webpackCompilerInstance;

connection.onInitialize(params => {
  const { capabilities, rootPath, rootUri } = params;

  workspacePath = rootPath;
  workspaceUri = rootUri;

  hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
  hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;
  hasDiagnosticRelatedInformationCapability =
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation;

  return {
    capabilities: {
      textDocumentSync: documents.syncKind
    }
  };
});

connection.onInitialized(async params => {
  if (hasConfigurationCapability) {
    // Register for all conifiguration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received.");
    });
  }

  let { compiler, config } = makeWebpackCompiler(workspacePath, "production");

  /** @type {Compiler} */
  webpackCompilerInstance = compiler;
  webpackCompilerInstance.outputFileSystem = fs;
});

connection.onNotification(WLS.WEBPACK_SERVE_BUILD_SUCCESS, params => {
  webpackCompilerInstance.run((err, stats) => {
    if (err !== null) {
      connection.sendNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_ERROR, { stats: stats.toJson() });
    } else {
      connection.sendNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, { stats: stats.toJson() });
    }
  });
});

connection.listen();
documents.listen(connection);
