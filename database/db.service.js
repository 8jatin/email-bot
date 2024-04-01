import ExcelJS from "exceljs";

class DBService {
  async insertInitialDetailInDB(collection, worksheet, excelFilePath) {
    const existingWorkbook = new ExcelJS.Workbook();
    await existingWorkbook.xlsx.readFile(excelFilePath);

    // Copy "Indian Companies" worksheet to the new workbook
    const existingWorksheet = existingWorkbook.getWorksheet(worksheet);

    let titleStartRow = null;

    // Find the column where the title "CIN" is located
    for (let i = 1; i <= 10; i++) {
      existingWorksheet
        .getRow(i)
        .eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (
            cell.value &&
            cell.value.toString().trim().toUpperCase() === "CIN"
          ) {
            titleStartRow = i; // Set titleStartRow to the row number
          }
        });
      if (titleStartRow) break;
    }

    // Iterate over rows and insert into the database
    for (
      let rowNumber = titleStartRow;
      rowNumber <= existingWorksheet.rowCount;
      rowNumber++
    ) {
      const row = existingWorksheet.getRow(rowNumber);

      // Assuming you have valid column indexes for CIN, Name, Email, Address, and Evaluated
      const cin = row.getCell("A").text; // Use .text or .value based on your ExcelJS version

      // Check if the entry with the same CIN already exists in the database
      const existingEntry = await collection.findOne({ cin });

      if (existingEntry) {
        continue;
      } else {
        // Entry with the same CIN does not exist, insert a new one
        const companyDetails = {
          name: row.getCell("C").value, // Adjust .text or .value accordingly
          class: row.getCell("B").value,
          cin: row.getCell("A").value,
          date_of_registration: row.getCell("D").value,
          type: row.getCell("E").value,
          evaluated: false,
        };

        // Use upsert to insert or update based on CIN
        await collection.updateOne(
          { cin },
          { $set: companyDetails },
          { upsert: true }
        );
      }
    }
    console.log("-------completed inserting in DB--------");
  }
  async getUnprocessedCompaniesFromDB(collection) {
    try {
      // Fetch all documents where "Evaluated" is not true or is missing
      const unprocessedCompaniesCursor = await collection
        .find({
          $or: [
            { evaluated: { $ne: true } },
            { evaluated: { $exists: false } },
          ],
        })
        .toArray();

      // Extract company names from the cursor
      const unprocessedCompanies = await unprocessedCompaniesCursor
        .map((company) => company.name)
        .filter((name) => name !== null && name !== undefined);

      return unprocessedCompanies;
    } catch (error) {
      console.error("Error in getUnprocessedCompaniesFromDB:", error);
      throw error; // Re-throw the error to handle it in the calling code
    }
  }
  async addScrapedDetailToDB(collection, details, companyName) {
    // Get the existing details from the MongoDB collection
    const existingDetails = await collection.findOne({
      name: companyName,
    });
    // Merge the existing details with the new details
    const mergedDetails = {
      ...existingDetails,
      ...details,
      name: companyName,
      evaluated: true,
    };

    // Upsert the merged details into the MongoDB collection
    const query = { name: companyName };
    const update = { $set: mergedDetails };
    const options = { upsert: true };

    await collection.updateOne(query, update, options);
  }
}

const dbService = new DBService();
export { dbService as DBService };
