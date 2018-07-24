const fs = require("fs");
const path = require("path");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");
const puppeteer = require("puppeteer");
const { CDS } = require("../events");

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
let chromiumPath;
let puppetteerInstance;
let browser;
let page;

/**
 * @returns {string}
 */
const getChromiumExecutable = () => {
  const localNodeModules = path.resolve(__dirname, path.join("..", "..", "node_modules"));
  const chromiumPath = path.resolve(localNodeModules, path.join("puppeteer", ".local-chromium"));
  const subDirs = fs.readdirSync(chromiumPath);
  if (subDirs.length) {
    console.info("THE CHOMIUM EXECUTABLE LINUX REVISION SUBDIR:", subDirs);
    return path.join(chromiumPath, subDirs[0], "chrome-linux", "chrome");
  } else {
    throw new Error("Couldn't find chrome executable due to missing revision number");
  }
};

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
    browser = await puppeteer.launch({ executablePath: getChromiumExecutable(), args: ["--no-sandbox", "--disable-setuid-sandbox"] });
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

connection.onNotification(CDS.CODE_DEPLOYMENT_SUCCESS, ({ uri, stats }) => {
  // Start running coverage
  console.log("Deployment complete - start diag");
});

connection.listen();
documents.listen(connection);
