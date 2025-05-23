import { Elysia } from "elysia";
import { cron } from "@elysiajs/cron";
import Email from "~/models/Email";
import Sms from "~/models/Sms";
import sendEmail from "./sendEmail";
import sendSMS from "./sendSMS";

// Create a new Elysia instance for cron jobs
export const cronJobs = new Elysia()
  .use(
    cron({
      name: "send-pending-emails",
      // Run every 1 minute
      pattern: "*/1 * * * *",
      async run() {
        console.log("Running email sending cron job...");
        try {
          // Find all unsent emails
          const pendingEmails = await Email.find({ isSent: false }).limit(20);

          console.log(`Found ${pendingEmails.length} pending emails to send`);

          // Process each email
          for (const email of pendingEmails) {
            try {
              const result = await sendEmail({
                to: email.email,
                subject: email.subject,
                html: email.body,
              });

              if (result.success) {
                // Update the email as sent
                email.isSent = true;
                await email.save();
                console.log(
                  `Email sent successfully to ${email.email} with ID: ${result.messageId}`
                );
              } else {
                console.error(
                  `Failed to send email to ${email.email}:`,
                  result.error
                );
              }
            } catch (error) {
              console.error(`Error processing email to ${email.email}:`, error);
            }
          }
        } catch (error) {
          console.error("Error in email sending cron job:", error);
        }
      },
    })
  )
  .use(
    cron({
      name: "send-pending-sms",
      // Run every 1 minutes
      pattern: "*/1 * * * *",
      async run() {
        console.log("Running SMS sending cron job...");
        try {
          // Find all unsent SMS messages
          const pendingSms = await Sms.find({ isSent: false }).limit(20);

          console.log(
            `Found ${pendingSms.length} pending SMS messages to send`
          );

          // Process each SMS
          for (const sms of pendingSms) {
            try {
              const result = await sendSMS({
                smsText: sms.message,
                recipient: sms.phone,
              });

              if (result && result !== false) {
                // Update the SMS as sent
                sms.isSent = true;
                await sms.save();
                console.log(`SMS sent successfully to ${sms.phone}`);
              } else {
                console.error(`Failed to send SMS to ${sms.phone}`);
              }
            } catch (error) {
              console.error(`Error processing SMS to ${sms.phone}:`, error);
            }
          }
        } catch (error) {
          console.error("Error in SMS sending cron job:", error);
        }
      },
    })
  );
