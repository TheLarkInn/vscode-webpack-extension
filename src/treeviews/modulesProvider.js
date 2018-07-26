const { TreeItem, TreeItemCollapsibleState, EventEmitter } = require("vscode");
const LanguageClientDispatcher = require("../languageClientDispatcher");
const path = require("path");
const { WLS } = require("../events");

/** @typedef {import("vscode").ExtensionContext} ExtensionContext */

module.exports = class ModulesProvider {
  /**
   * @param {ExtensionContext} context
   * @param {LanguageClientDispatcher} dispatcher
   */
  constructor(workspace, context, dispatcher) {
    this._modules = [];
    this._workspace = workspace;
    this._context = context;
    this._onDidChangeTreeData = new EventEmitter();
    this.rootPath = this._workspace.rootPath;
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.outputPath = "";

    dispatcher.onNotification(WLS.WEBPACK_SERVE_BUILD_SUCCESS, params => {
      dispatcher.dispatch(WLS.WEBPACK_SERVE_BUILD_SUCCESS, params);
      const { stats } = params;

      this._modules = stats.modules;
      this.refresh();
    });
  }

  refresh(newModules) {
    this._onDidChangeTreeData.fire();
  }

  /**
   *
   * @param {BuiltModule} element
   * @returns {TreeItem}
   */
  getTreeItem(element) {
    return element;
  }

  /**
   * @param {any} rawModule
   * @returns {BuiltModule}
   */
  createModuleFromStatsRecord(rawModule) {
    if (rawModule.issuerPath) {
      return new BuiltModule(rawModule.name, TreeItemCollapsibleState.Collapsed, rawModule);
    } else {
      return new BuiltModule(rawModule.name, TreeItemCollapsibleState.None);
    }
  }

  getChildren(element) {
    const modules = this._modules.filter(path => path.identifier.startsWith(this.rootPath));
    let itemSelected;

    if (element) {
      itemSelected = true;
    }

    return new Promise(resolve => {
      if (itemSelected) {
        resolve(element.rawModuleData.issuerPath.map(this.createModuleFromStatsRecord, this));
      }
      resolve(modules.map(this.createModuleFromStatsRecord, this));
    });
  }
};

class BuiltModule extends TreeItem {
  /**
   * @param {string} label
   * @param {any} collapsibleState
   */
  constructor(label, collapsibleState, rawModuleData = {}) {
    super(label, collapsibleState);
    this.rawModuleData = rawModuleData;
  }
}
