/**
 * @param {string} pageUrl
 * @param {any} browser
 */
const getCoverage = async (pageUrl, browser) => {
  const page = await browser.newPage();
  console.log("new page created");
  await Promise.all([page.coverage.startJSCoverage(), page.coverage.startCSSCoverage()]);
  console.log("coverage started");
  await page.goto(pageUrl);
  console.log("navigated to", pageUrl);
  const [jsCoverage, cssCoverage] = await Promise.all([page.coverage.stopJSCoverage(), page.coverage.stopCSSCoverage()]);
  console.log("coverage recieved");
  return [...jsCoverage, ...cssCoverage];
};

module.exports = getCoverage;
