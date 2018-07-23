/** @typedef {import("memory-fs")} MemoryFileSystem */

const MemoryFileSystem = require("memory-fs");

/**
 * This fn allows you to take a serialized fs instance sent between Language Service Notifications,
 * and rehydrate it as if it was a shared MemoryFileSystem instance
 * 
 * ```js
dispatcher.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, (params, issuer) => {
  dispatcher.dispatch(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, params);

  const fs = rehydrateFs(params.fs);
  console.log(fs.readdirSync(params.stats.outputPath));
});
```
 * 
 * @param {MemoryFileSystem|{data: Object}} memFsInstance
 */
const rehydrateFs = memFsInstance => {
  return new MemoryFileSystem(memFsInstance.data);
};

exports.rehydrateFs = rehydrateFs;
