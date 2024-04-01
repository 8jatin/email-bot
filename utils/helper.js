export async function scrapeCompanyDetails(page) {
  const details = {};

  // Extract company status
  details.companyStatus = await page.$eval("#COMPANY-STATUS", (element) =>
    element.textContent.trim()
  );

  // Extract financial details
  details.financialDetails = await page.$eval("#FINANCIAL-DETAILS", (element) =>
    element.textContent.trim()
  );

  // Extract contact details
  details.contactDetails = await page.$eval("#CONTACT-DETAILS", (element) =>
    element.textContent.trim()
  );

  // Extract director details
  details.directorDetails = await page.$eval("#COMPANY-DIRECTORS", (element) =>
    element.textContent.trim()
  );

  return await processScrapedDetails(details);
}

export async function processScrapedDetails(scrapedDetails) {
  const formattedDetails = {};

  // Process Company Status
  const companyStatusRegex = /Company Status[\s\S]+?\t(\w+)/;
  const companyStatusMatch =
    scrapedDetails.companyStatus.match(companyStatusRegex);
  formattedDetails.companyStatus = companyStatusMatch
    ? companyStatusMatch[1]
    : "";

  // Process Financial Details
  const financialDetailsRegex =
    /Authorised Capital[\s\S]+?(\d+)[\s\S]+?PaidUp Capital[\s\S]+?(\d+)[\s\S]+?Last Annual General Meeting Date/;
  const financialDetailsMatch = scrapedDetails.financialDetails.match(
    financialDetailsRegex
  );
  formattedDetails.authorisedCapital = financialDetailsMatch
    ? financialDetailsMatch[1]
    : "";
  formattedDetails.paidUpCapital = financialDetailsMatch
    ? financialDetailsMatch[2]
    : "";

  // Process Contact Details
  const contactDetailsRegex =
    /State[\s\S]+?(\w+)[\s\S]+?PIN Code[\s\S]+?(\d+)[\s\S]+?Country[\s\S]+?(\w+)[\s\S]+?Address[\s\S]+?(\S[\s\S]+?)(?=\bEmail\b)+?Email[\s\S]+?(\S+)/;
  const contactDetailsMatch =
    scrapedDetails.contactDetails.match(contactDetailsRegex);

  // Process Contact Details
  formattedDetails.state = contactDetailsMatch ? contactDetailsMatch[1] : "";
  formattedDetails.pinCode = contactDetailsMatch ? contactDetailsMatch[2] : "";
  formattedDetails.country = contactDetailsMatch ? contactDetailsMatch[3] : "";
  formattedDetails.address = contactDetailsMatch
    ? contactDetailsMatch[4].trim()
    : "";
  formattedDetails.email = contactDetailsMatch ? contactDetailsMatch[5] : "";

  // Process Director Details
  const directorDetailsRegex =
    /Director Details[\s\S]+?\n\s+(\w+\s\w+)[\s\S]+?DIN:\s(\d+)[\s\S]+?\n\s+(\w+\s\w+)[\s\S]+?DIN:\s(\d+)/g;
  const directorDetailsMatches = [
    ...scrapedDetails.directorDetails.matchAll(directorDetailsRegex),
  ];
  formattedDetails.directorDetails = directorDetailsMatches.map((match) => ({
    name: match[1],
    din: match[2],
  }));

  return formattedDetails;
}

export function sanitizeForHref(companyName) {
  return companyName
    .toLowerCase() // Convert to lowercase
    .replace(/(^\s+|\s+$)/g, "") // Trim leading and trailing spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Remove any character that is not a letter, number, or hyphen
}
