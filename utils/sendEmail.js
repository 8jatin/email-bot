import { createTransport } from "nodemailer";
import dotenv from "dotenv";
import { dbSetup } from "../database/setup.js";
dotenv.config();

// Constants
const DB_URL = process.env.DB_URI;
const DB_COLLECTION_NAME = `companies-Feb2-24`;
const MAX_ERRORS = 5;
const EMAIL_LIMIT = 400;
const test = false; // Set to true for test mode

// Function to introduce delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to find director's name
function findDirectorName(recipient) {
  return (
    (recipient.directorDetails &&
      recipient.directorDetails[0] &&
      recipient.directorDetails[0].name) ||
    recipient.name
  );
}

// Function to sanitize name
function sanitizeName(name) {
  return name.replace(/\b\w+/g, (word) => {
    const lowercasedWord = word.toLowerCase();
    return lowercasedWord.charAt(0).toUpperCase() + lowercasedWord.slice(1);
  });
}

// Function to send an email
async function sendEmail(transporter, mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Function to update recipient in database
async function updateRecipientInDatabase(collection, recipient) {
  try {
    await collection.updateOne(
      { _id: recipient._id },
      { $set: { sent: true, sentDate: new Date() } },
      { upsert: true }
    );
    console.log("Recipient updated:", recipient.name);
  } catch (error) {
    console.error("Error updating recipient in database:", error);
    throw error;
  }
}

// Function to send a test email
async function testSendEmail(transporter, mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Test email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending test email:", error);
    throw error;
  }
}

// Function to run test mode
async function runTest(transporter) {
  // Customize the mailOptions for your test email
  const testMailOptions = {
    from: process.env.USERNAME, // Sender address
    to: "your.custom.email@example.com", // Your custom email address
    subject: "Test Email", // Subject
    text: "This is a test email.", // Email content
  };

  // Send the test email immediately without any delay
  await testSendEmail(transporter, testMailOptions);
}

// Modified sendEmailWithDelay function to conditionally run the test
async function sendEmailWithDelay(
  transporter,
  mailOptions,
  collection,
  recipient
) {
  try {
    // If test mode is enabled, run the test function and return
    if (test) {
      await runTest(transporter);
      return;
    }

    // Introduce delay only when not in test mode
    const randomDelay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
    await delay(randomDelay); // Introduce random delay

    // Send email
    const info = await sendEmail(transporter, mailOptions);
    // Update recipient in database
    await updateRecipientInDatabase(collection, recipient);
    return info;
  } catch (error) {
    throw error; // Re-throw error for handling at higher level
  }
}

// Main function to send emails
async function sendEmails() {
  let consecutiveErrors = 0;

  try {
    const collection = await dbSetup(DB_URL, DB_COLLECTION_NAME);

    // Fetch recipients from MongoDB
    const recipients = await collection
      .find({
        $or: [{ sent: false }, { sent: null }],
        email: { $exists: true },
      })
      .limit(500)
      .toArray();

    if (recipients.length === 0) {
      console.log("No more emails to send. Exiting.");
      return;
    }

    let emailsSent = 0;

    // Iterate through recipients and send emails
    for (const recipient of recipients) {
      if (emailsSent >= EMAIL_LIMIT) {
        console.log("Email limit reached. Exiting.");
        break;
      }
      // Get director's name
      const name = findDirectorName(recipient);
      const username = sanitizeName(name);

      const mailOptions = {
        from: process.env.USERNAME, // Sender address
        to: recipient.email, // Recipient address
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
      // Create transporter
      const transporter = createTransport({
        service: "gmail",
        auth: {
          user: process.env.USERNAME,
          pass: process.env.PASSWORD,
        },
      });

      // Send email with delay
      await sendEmailWithDelay(transporter, mailOptions, collection, recipient);
      emailsSent++;
      console.log("--------------Total email sent-------", emailsSent);
    }

    console.log("-------------ALL DONE FOR THE DAY------------");
  } catch (error) {
    consecutiveErrors++;
    console.error("Error:", error);
  }
}

// Usage example
if (test) {
  sendEmailWithDelay(transporter, mailOptions, null, null)
    .then(() => {
      console.log("Test email sent successfully");
    })
    .catch((error) => {
      console.error("Failed to send test email:", error);
    });
} else {
  sendEmails();
}
