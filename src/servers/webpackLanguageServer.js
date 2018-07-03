const webpack = require("webpack");
const webpackServe = require("webpack-serve");
const webpackMerge = require("webpack-merge");
const makeWebpackCompiler = require("../build/makeWebpackCompiler");

const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");

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
let webpackDevServerInstance;

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

  let { compiler, config } = makeWebpackCompiler(workspacePath, "development");

  webpackCompilerInstance = compiler;
  try {
    webpackDevServerInstance = await webpackServe({ config });
    webpackDevServerInstance.on("listening", ({ server, options }) => {
      console.info("webpack server started");
    });

    webpackDevServerInstance.on("build-finished", ({ stats, compiler }) => {
      console.log("Build Finished Event", stats);
    });

    webpackDevServerInstance.on("compiler-error", ({ stats, compiler }) => {
      console.error(stats);
    });

    webpackDevServerInstance.on("compiler-warning", ({ stats, compiler }) => {
      console.warn(stats);
    });

    documents.onDidSave(event => {
      if (/webpack\.config\.js/.test(event.document.uri)) {
        webpackDevServerInstance.close(async () => {
          // Restarting the server
          webpackCompilerInstance.purgeInputFileSystem();
          let { compiler, config } = makeWebpackCompiler(workspacePath, "development");
          webpackCompilerInstance = compiler;
          webpackDevServerInstance = await webpackServe({ config });
        });
      }
    });
  } catch (error) {
    console.error(error);
  }
});

connection.listen();
documents.listen(connection);
