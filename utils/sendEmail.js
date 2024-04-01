import { createTransport } from "nodemailer";
import dotenv from "dotenv";
import { dbSetup } from "../database/setup.js";
let test = true;
dotenv.config();
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
const DB_URL = process.env.DB_URI;
const DB_COLLECTION_NAME = `companies-Feb2-24`;
const MAX_ERRORS = 5;

function sanitizeName(name) {
  return name.replace(/\b\w+/g, (word) => {
    const lowercasedWord = word.toLowerCase();
    return lowercasedWord.charAt(0).toUpperCase() + lowercasedWord.slice(1);
  });
}

async function sendEmails() {
  let consecutiveErrors = 0;
  try {
    const collection = await dbSetup(DB_URL, DB_COLLECTION_NAME);

    // Fetch recipients from MongoDB
    const recipients = await collection
      .find({ $or: [{ sent: false }, { sent: null }], email: { $exists: true } })
      .limit(500)
      .toArray();

    if (recipients.length === 0) {
      console.log("No more emails to send. Exiting.");
      return;
    }

    let emailsSent = 0;

    const sendEmailWithDelay = (recipient) => {
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            if (!recipient.email) {
              resolve(); // Resolve immediately if no email
              return;
            }

            const directorDetails = recipient.directorDetails;
            const name =
              (directorDetails && directorDetails[0] && directorDetails[0].name) ??
              recipient.name;
            const username = sanitizeName(name);

            console.log(username);

            const mailOptions = {
              from: process.env.USERNAME, // Sender address
              to:recipient.email, // Recipient address
              subject: "Let's Enhance Your Online Presence Together", // Subject
              text: `Dear ${username},
Thrilled to hear about your new business venture! This is an exciting time, and we're here to support your journey in amplifying your online presence by creating website and custom softwares.

Take a look at some of the websites we've created:
Zecotok Porfolio - https://www.zecotok.com/
IT Waves - https://www.it-waves.com/
Recro Soft Technologies - https://recro.io/
The Vintage Vows - https://thevintagevows.com/
Noumena Partners - https://www.noumena.pro/

I’d love to discuss how we can assist in elevating your business to online success. Please don't hesitate to reach out directly at 6283878150. 

Warm regards,
Pankaj Sharma
Zecotok
Contact: 6283878150
Email: pankaj.zectok@gmail.com
`, // Email content
            };

            // Create a transporter
            const transporter = createTransport({
              service: "gmail",
              auth: {
                user: process.env.USERNAME,
                pass: process.env.PASSWORD,
              },
            });

            // Send the email
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent: " + info.response);

            // Update MongoDB document on successful email send
        
            await collection.updateOne(
              { _id: recipient._id },
              { $set: { sent: true, sentDate: new Date() } },
              { upsert: true }
            );
            console.log("Recipient updated:", recipient.name);
         

            emailsSent++;
            console.log("--------------Total email sent-------", emailsSent);
            resolve(); // Resolve the promise after sending the email
          } catch (error) {
            reject(error); // Reject the promise if an error occurs
          }
        }, Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000); // Random delay between 30 sec to 1 min
      });
    };

    // Iterate through recipients and send emails
    for (const recipient of recipients) {
      if (emailsSent >= 400) {
        console.log("Email limit reached. Exiting.");
        break;
      }

      await sendEmailWithDelay(recipient);
    }

    console.log("-------------ALL DONE FOR THE DAY------------");
  } catch (error) {
    consecutiveErrors++;
    console.error("Error:", error);
  }
}



// Call the function to send emails
sendEmails();
