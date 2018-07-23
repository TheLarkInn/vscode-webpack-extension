const fs = require("fs");
const path = require("path");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");
const { WLS } = require("../events");

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

/** @type {string=} */
let workspacePath;
/** @type {string=} */
let workspaceUri;
/** @type {string=} */
let browser;
let page;

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
  console.log("initialize"); 

});

connection.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, ({ uri, stats }) => {
  // Start deployment
  console.log("prod build success");

});

connection.listen();
documents.listen(connection);
