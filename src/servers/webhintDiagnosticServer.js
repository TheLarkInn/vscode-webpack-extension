const fs = require("fs");
const path = require("path");
const runWebhints = require("../utils/runWebhints");

const { rehydrateFs } = require("../fsUtils");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");

const { WLS, CDS } = require("../events");

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
// TODO: Remove this duplication
const defaultURI = "https://vscodesandbox.blob.core.windows.net";

/** @type {string=} */
let workspacePath;
/** @type {string=} */
let workspaceUri;
/** @type {string=} */
let browser;
let page;
let productionHash;
let engine;
let resources;
let config;

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

connection.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, params => {
  productionHash = params.stats.hash;
});

connection.onInitialized(params => {});

connection.onNotification(CDS.CODE_DEPLOYMENT_SUCCESS, async () => {
  const productionUrl = `${defaultURI}/${productionHash}/index.html`;
  console.log(productionUrl);
  try {
    const problems = await runWebhints(productionUrl);

    console.error(productionUrl, problems);
  } catch (err) {
    console.error(err);
  }
});

connection.listen();
documents.listen(connection);
