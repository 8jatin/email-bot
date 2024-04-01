import path from "path";
import ExcelJS from "exceljs";
import { chromium } from "playwright";
import PQueue from "p-queue";
import dotenv from "dotenv";
import { DBService } from "./database/db.service.js";
import dataProcessService from "./dataProcessor/dataProcess.service.js";
import { dbSetup } from "./database/setup.js";

dotenv.config();

const BASE_URL = process.env.SEARCH_URL;
const EXCEL_FILE_PATH = `/Users/apple/Downloads/Monthly-Company-and-LLP-incorporation-FO-portal-report-FEB2024-20240301.xlsx`; //In place of this empty string use path where your MCA generated excel file is located
const DB_URL = process.env.DB_URI;

const queue = new PQueue({ concurrency: 5 });

const date = new Date();
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const month = monthNames[date.getMonth()];
const year = date.getFullYear().toString().substr(-2);

const NEW_EXCEL_FILE_NAME = `companies-${month}-${year}.xlsx`;

const DB_COLLECTION_NAME = `companies-Feb2-${year}`;

const WORKSHEET_NAME = "Indian Companies";
const NEW_EXCEL_FILE_PATH = path.join(process.cwd(), NEW_EXCEL_FILE_NAME);

async function createAndSaveNewWorkbook() {
  const newWorkbook = new ExcelJS.Workbook();
  const newWorksheet = newWorkbook.addWorksheet(WORKSHEET_NAME);

  // Save the new workbook to the current working directory
  const workbookExists = await newWorkbook.xlsx
    .readFile(NEW_EXCEL_FILE_PATH)
    .catch(() => null);
  if (!workbookExists) {
    await newWorkbook.xlsx.writeFile(NEW_EXCEL_FILE_PATH);
    console.log(`New workbook created and saved to "${NEW_EXCEL_FILE_PATH}"`);
  }
  return workbookExists ? true : false;
}

async function main() {
  const collection = await dbSetup(DB_URL, DB_COLLECTION_NAME);
  // await DBService.insertInitialDetailInDB(
  //   collection,
  //   WORKSHEET_NAME,
  //   EXCEL_FILE_PATH
  // ); // uncomment for first time running this code and then comment it afterwards.
  const companyNames = await DBService.getUnprocessedCompaniesFromDB(
    collection
  );
  const selected = companyNames.slice(1); // Remove .slice method to select all the companies who doesn't have email and addresses in excel file.
  const browser = await chromium.launch({ headless: true });

  await Promise.all(
    selected.map((companyName) =>
      queue.add(() =>
        dataProcessService.processCompany(
          companyName,
          browser,
          collection,
          BASE_URL
        )
      )
    )
  );

  await queue.onIdle();
  await browser.close();
}

main().catch(console.error);
