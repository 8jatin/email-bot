import { DBService } from "../database/db.service.js";
import { scrapeCompanyDetails, sanitizeForHref } from "../utils/helper.js";

class DataProcessor {
  async processCompany(companyName, browser, collection, url) {
    let context = null;
    try {
      context = await browser.newContext(); // Create a new browser context for each company
      const page = await context.newPage();
      await page.goto(url);
      await page.type('input[placeholder="Search company..."]', companyName, {
        delay: 10,
      });
      await page.click("#bttnsearch");

      const sanitizedCompanyName = sanitizeForHref(companyName);

      // Assuming the div containing the company name has a class "company-name-div"
      const companyDivSelector = `.fs-6.text-uppercase:has-text("${sanitizedCompanyName}")`;

      // Wait for the div to be attached
      await page.waitForSelector(companyDivSelector, { state: "attached" });

      // Click on the company div
      await page.click(companyDivSelector);

      await page.waitForLoadState("load");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const details = await scrapeCompanyDetails(page);
      await DBService.addScrapedDetailToDB(collection, details, companyName);
      console.log(`Successfully added details of ${companyName} in DB`);
    } catch (error) {
      console.error(`Error processing ${companyName}:`);
    } finally {
      if (context) {
        await context.close();
      }
    }
  }
}

export default new DataProcessor();
