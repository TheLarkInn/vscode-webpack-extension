const { URL } = require("url");
const { Configuration } = require("hint/dist/src/lib/config");
const { Engine } = require("hint");
const { loadResources } = require("hint/dist/src/lib/utils/resource-loader");

/**
 * @param {string} url
 */
async function getProblemsForUrl(url) {
  try {
    // @ts-ignore
    const config = Configuration.fromConfig({
      connector: {
        name: "chrome",
        options: {
          flags: ["--headless"]
        }
      },
      extends: ["web-recommended"]
    });

    const pageUrl = new URL(url);
    const resource = loadResources(config);
    console.log(resource, "GRAB RESOURCE");
    const engine = new Engine(config, resource);
    console.log(engine, "GRAB ENGINE");
    const problems = await engine.executeOn(pageUrl);
    console.log(problems);
    return problems;
  } catch (e) {
    console.error(e);
  }
}

module.exports = getProblemsForUrl;
