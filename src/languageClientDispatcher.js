const { each } = require("async");

/** @typedef {import("vscode-languageclient").LanguageClient} LanguageClient */

class LanguageClientDispatcher {
  /**
   *
   * @param {LanguageClient[]} languageClients
   */
  constructor(...languageClients) {
    /** @private @type {Set<LanguageClient>}*/
    this._languageClients = new Set();

    for (let languageClient of languageClients) {
      this.registerLanguageClient(languageClient);
    }
  }

  /**
   * @param {LanguageClient} languageClient
   */
  registerLanguageClient(languageClient) {
    this._languageClients.add(languageClient);
    return true;
  }

  /**
   * @param {LanguageClient} languageClient
   */
  unregisterLanguageClient(languageClient) {
    if (this._languageClients.has(languageClient)) {
      return this._languageClients.delete(languageClient);
    }
    return false;
  }

  /**
   * @template P
   * @param {*} message
   * @param {P} params
   */
  dispatch(message, params) {
    each(Array.from(this._languageClients), languageClient => {
      languageClient.sendNotification(message, params);
    });
  }

  /**
   * Starts all language clients currently registered to dispatcher.
   * Equivalent of calling `languageClient.start()` for each instance.
   */
  startAll() {
    return Array.from(this._languageClients).map(languageClient => languageClient.start());
  }
}

module.exports = LanguageClientDispatcher;
