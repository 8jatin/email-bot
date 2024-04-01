import { MongoClient } from "mongodb";

export async function dbSetup(url,collection_name) {
  const uri = url; // Replace with your MongoDB connection string
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("companyData"); // Create or connect to the database

    // Create collections if they don't already exist
    const companiesCollection = database.collection(collection_name);

    console.log("Database and collections initialized successfully");

    return companiesCollection;
  } catch (e) {
    console.error("Error initializing database: ", e);
  }
}
