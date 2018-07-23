const fs = require("fs");
const path = require("path");
const { rehydrateFs } = require("../fsUtils");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");
const { WLS } = require("../events");

const storage = require('azure-storage');
const AZURE_STORAGE_CONNECTION_STRING="AZURE STORAGE CONNECTION STRING"
const blobService = storage.createBlobService(AZURE_STORAGE_CONNECTION_STRING);

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


connection.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, (params, issuer) => {
  const fs = rehydrateFs(params.fs);
  console.log(fs.readdirSync(params.stats.outputPath));

  // create blob is it doesnt exist
  createContainer(params.stats.hash).then(function() {
    //loop through files in fs, and upload
    for (var file in params.stats.assets) {
      var meta = params.stats.assets[file];
      var f = fs.readFileSync(path.join(params.stats.outputPath, meta.name))
      upload(params.stats.hash, meta.name, f.data.toString(), meta.size).then().catch(function(e) {
        console.log(e);
      });
    }
  }).catch(function(e) {
    console.log(e);
  });
});

const createContainer = (containerName) => {
  return new Promise((resolve, reject) => {
      blobService.createContainerIfNotExists(containerName, { publicAccessLevel: 'blob' }, err => {
          if(err) {
              reject(err);
          } else {
              resolve({ message: `Container '${containerName}' created` });
          }
      });
  });
};

const upload = (containerName, blobName, blobText, length) => {
  return new Promise((resolve, reject) => {
      blobService.createBlockBlobFromText(containerName, blobName, blobText, err => {
          if (err) {
              reject(err);
          } else {
              resolve({ message: `Upload of '${blobName}' complete` });
          }
      });
  });
}; 

connection.listen();
documents.listen(connection);
