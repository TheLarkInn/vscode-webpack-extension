const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const whichChrome = require("which-chrome");
const { SourceMapConsumer } = require("source-map");
const { DidChangeConfigurationNotification, TextDocuments, ProposedFeatures, createConnection } = require("vscode-languageserver");
const uniqBy = require("lodash.uniqby");

const getCoverage = require("../getCoverage");
const { rehydrateFs } = require("../fsUtils");
const { BCS, WLS, CDS } = require("../events");
const defaultURI = "https://vscodesandbox.blob.core.windows.net";

let builtMaps = new Map();
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
let productionHash;
let page;
let memFs;
let lastBuildStats;
let outputPath;

/**
 * @typedef {Object} CoverageRecordRange
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {Object} CoverageRecord
 * @property {string} url
 * @property {CoverageRecordRange[]} ranges the start and end ranges where code _was_ coverered
 * @property {string} text the full string source of the asset found
 */

/**
 * @typedef {{unminifiedRanges: CoverageRecordRange[]}&CoverageRecord} UnminifiedCoverageRecord
 */

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

connection.onNotification(WLS.WEBPACK_CONFIG_PROD_BUILD_SUCCESS, params => {
  lastBuildStats = params.stats;
  memFs = rehydrateFs(params.fs);
  outputPath = params.stats.outputPath;
  productionHash = params.stats.hash;
  params.stats.assets.filter(a => a.name.endsWith(".map")).forEach(asset => {
    console.log(asset);
    const sourceMapString = new Buffer(memFs.readFileSync(path.join(outputPath, asset.name))).toString("utf8");
    builtMaps.set(asset.name, sourceMapString);
  });
});

connection.onNotification(CDS.CODE_DEPLOYMENT_SUCCESS, async () => {
  try {
    const coverage = await getCoverage(`${defaultURI}/${productionHash}/index.html`, browser);
    console.log(coverage, builtMaps);
    const unminifiedCoverage = await getUnminifiedCoverageRecords(coverage);
    console.log(lastBuildStats, memFs);
    connection.sendNotification(BCS.BROWSER_COVERAGE_COLLECTED, { coverage, unminifiedCoverage });
  } catch (error) {
    console.error(error);
    connection.sendNotification(BCS.BROWSER_COVERAGE_ERROR, { error });
  }
});

connection.listen();
documents.listen(connection);

/**
 *
 * @param {CoverageRecord[]} coverages
 * @returns {Promise<UnminifiedCoverageRecord[]>}
 */
const getUnminifiedCoverageRecords = async coverages => {
  // For each covered asset
  // Create a SourceMapConsumer which plucks the raw sourcemap from the build
  // Use the getOriginalPositionAt method but for each range calculation
  // use this to collect the covered "non minified" range and source positions
  try {
    const unminifiedCoverageRecords = await Promise.all(
      // For each covered asset from page
      coverages.map(async coverage => {
        let originalSourceName = coverage.url.split("/").pop();
        const record = await getUnminifiedPositionFromCoverageRecord(originalSourceName, coverage);
        return record;
      })
    );
    return unminifiedCoverageRecords;
  } catch (error) {
    console.log(error);
  }
};

/**
 *
 * @param {string} originalSourceName filename for the source (just name not full url)
 * @param {CoverageRecord} coverageRecord the coverage record itself
 * @returns {Promise<UnminifiedCoverageRecord>}
 */
const getUnminifiedPositionFromCoverageRecord = async (originalSourceName, coverageRecord) => {
  let unminifiedRanges = [];
  let mappings = [];
  let mappingsBySource;
  var uncoveredMappings = [];

  const rawMap = builtMaps.get(`${originalSourceName}.map`);
  try {
    const consumer = await new SourceMapConsumer(rawMap);
    consumer.eachMapping(mapping => {
      if (mapping.source !== "webpack:///webpack/bootstrap") {
        mappings.push(mapping);
      }
    });

    mappingsBySource = groupToMap(mappings, "source");

    coverageRecord.ranges.forEach(range => {
      let { start, end } = range;
      let [newStart, newEnd] = [start, end].map(column => {
        return consumer.originalPositionFor({ line: 1, column });
      });

      if (newStart.source === "webpack:///webpack/bootstrap" && newEnd.source !== "webpack:///webpack/bootstrap") {
        newStart.line = 0;
      }

      // Handle beginning of the coverage report
      if (typeof newStart.line === "number" && newEnd.line === null) {
        newEnd.line;
      }

      unminifiedRanges.push({ start: newStart, end: newEnd });
    });

    const realSourceRanges = unminifiedRanges.filter(({ start, end }) => {
      return [start, end].some(offset => offset.source !== "webpack:///webpack/bootstrap" || offset.source !== null);
    });

    mappingsBySource.forEach((mappingsArray, sourceName, index) => {
      mappingsArray.forEach(mapping => {
        if (!isMappingCovered(mapping, realSourceRanges)) {
          console.log(lastBuildStats);
          let module = getModuleFromMapping(lastBuildStats.modules, mapping);
          let mappedSourceString = module.source.split(/\n/)[mapping.originalLine - 1];
          uncoveredMappings.push({ mapping, mappedSourceString });
        }
      });
    });

    let uniqUncoveredMappings = uniqBy(uncoveredMappings, ({ mapping: { source, originalLine } }) => {
      return `${source}:${originalLine}`;
    });

    return Object.assign(coverageRecord, {
      unminifiedRanges: realSourceRanges,
      uncoveredMappings: uniqUncoveredMappings
    });
  } catch (error) {
    console.log(error);
  }
};

/**
 * @template T
 * @param {T[]} items
 * @param {keyof T} key
 * @returns {Map<keyof T, T[]>}
 */
const groupToMap = (items, key) => {
  const map = new Map();
  items.forEach(item => {
    if (map.has(item[key])) {
      map.set(item[key], [...(map.get(item[key]) || []), item]);
    } else {
      map.set(item[key], [item]);
    }
  });

  return map;
};

/**
 * @returns {boolean}
 */
const isMappingCovered = ({ source, originalLine }, coveredSourceRanges) => {
  let isCovered = false;

  coveredSourceRanges.forEach(({ start, end }) => {
    if (start.source === null) {
      start.line = 0;
    }

    if (end.source === source) {
      isCovered = originalLine > start.line && originalLine <= end.line;
    } else {
      isCovered = false;
    }
  });

  return isCovered;
};

const getModuleFromMapping = (modules, mapping) => {
  return [].concat(...modules.map(m => m.modules || [])).find(m => m.name.endsWith(mapping.source.replace("webpack:///", "")));
};

/**
 * @template T
 * @param {T[]} myArr
 * @param {keyof T} prop
 * @returns {T[]}
 */
const uniq = (myArr, prop) => {
  return myArr.filter((obj, pos, arr) => {
    return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
  });
};
