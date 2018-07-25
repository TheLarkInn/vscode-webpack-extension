const fs = require("fs");
const path = require("path");
const { rehydrateFs } = require("../fsUtils");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");
const { WLS, CDS } = require("../events");

const storage = require("azure-storage");
const AZURE_STORAGE_CONNECTION_STRING = "<";
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
  connection.sendNotification(CDS.CODE_DEPLYMENT_STARTED, {});
  const fs = rehydrateFs(params.fs);

  // create blob is it doesnt exist
  createContainer(params.stats.hash)
    .then(function(m) {
      console.log(m.message);

      //loop through files in fs, and upload
      var fileUploadPromises = [];
      for (const file of params.stats.assets) {
        let b = new Buffer(fs.readFileSync(path.join(params.stats.outputPath, file.name)));
        fileUploadPromises.push(
          upload(params.stats.hash, file.name, b)
            .then(function(m) {
              console.log(m.message);
            })
            .catch(function(error) {
              console.log(error);
            })
        );
      }

      Promise.all(fileUploadPromises).then(function() {
        console.log("All files uploaded");
        connection.sendNotification(CDS.CODE_DEPLOYMENT_SUCCESS, {});
      });
    })
    .catch(function(error) {
      console.log(error.message);
      if (error.code === "ContainerAlreadyExists") {
        connection.sendNotification(CDS.CODE_DEPLOYMENT_SUCCESS);
      } else {
        connection.sendNotification(CDS.CODE_DEPLOYMENT_ERROR);
      }
    });
});

const createContainer = containerName => {
  return new Promise((resolve, reject) => {
    blobService.createContainer(containerName, { publicAccessLevel: "blob" }, err => {
      if (err) {
        reject(err);
      } else {
        resolve({ message: `Container '${containerName}' created` });
      }
    });
  });
};

const contentTypes = {
  ".html":"text/html",
  ".jpeg": "text/jpeg",
  ".css": "text/css",
  ".js": "application/javascript"
};

const upload = (containerName, blobName, buffer) => {
  return new Promise((resolve, reject) => {
    let ext = path.extname(blobName);
    let text = ext === ".jpeg" ? buffer : buffer.toString(); 
    let contentSettings = { contentSettings: { contentType: contentTypes[ext] } }; 
 
    blobService.createBlockBlobFromText(containerName, blobName, text, contentSettings, err => {
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
