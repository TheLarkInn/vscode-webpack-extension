const path = require("path");
const { LanguageClient, TransportKind } = require("vscode-languageclient");

/** @typedef {import("vscode").ExtensionContext} ExtensionContext */
/** @typedef {typeof import("vscode").workspace} Workspace */
/** @typedef {import("vscode-languageclient").ServerOptions} ServerOptions */
/** @typedef {import("vscode-languageclient").LanguageClientOptions} LanguageClientOptions */

/**
 * @param {Workspace} workspace
 * @param {ExtensionContext} context
 * @returns {LanguageClient}
 */
const create = (workspace, context) => {
  const serverModule = context.asAbsolutePath(path.join("src", "servers", "webpackLanguageServer.js"));
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
  /** @type {ServerOptions} */
  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };
  /** @type {LanguageClientOptions} */
  const clientOptions = {
    documentSelector: [{ scheme: "file", language: "javascript" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/webpack.config.js")
    }
  };

  const client = new LanguageClient("webpack", "Webpack Language Server", serverOptions, clientOptions);
  return client;
};

exports.create = create;
