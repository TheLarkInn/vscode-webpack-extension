const fs = require("fs");
const path = require("path");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");
const puppeteer = require("puppeteer");
const whichChrome = require("which-chrome");
const getCoverage = require("../getCoverage");
const { BCS, WLS } = require("../events");

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

/** @type {string=} */
let workspacePath;
/** @type {string=} */
let workspaceUri;
let chromiumPath = whichChrome.Chrome;
let puppetteerInstance;
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
  try {
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      args: ["--remote-debugging-port=9222"]
    });
    console.log(browser);
  } catch (error) {
    console.error(error);
  }

  if (hasConfigurationCapability) {
    // Register for all conifiguration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

connection.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, async params => {
  try {
    const coverage = await getCoverage("http://127.0.0.1:8080", browser);
    console.log(coverage);
    connection.sendNotification(BCS.BROWSER_COVERAGE_COLLECTED, { coverage });
  } catch (err) {
    console.error(err);
    connection.sendNotification(BCS.BROWSER_COVERAGE_ERROR, { error });
  }
});

connection.listen();
documents.listen(connection);
