import nodemailer from "nodemailer";

const sendEmail = async ({
  to,
  subject,
  text = "",
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html: string;
}) => {
  // Create a transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: "Office365",
    secure: false,
    tls: {
      ciphers: "SSLv3",
    },
    host: "smtp.office365.com",
    port: 587,
    auth: {
      user: "nf@adamusgh.com",
      pass: "$123Pemp",
    },

    // Increase timeout
    connectionTimeout: 1 * 60 * 1000, // 1 minute
    greetingTimeout: 30 * 1000, // 30 seconds
    socketTimeout: 1 * 60 * 1000, // 1 minute
  });

  await new Promise((resolve, reject) => {
    // verify connection configuration
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Server is ready to take our messages");
        resolve(success);
      }
    });
  });

  // Define email options
  let mailOptions = {
    from: {
      name: "Adamus Med Treatment",
      address: "nf@adamusgh.com",
    },
    to: to, // List of receivers
    subject: subject, // Subject line
    text: text, // Plain text body
    html: html, // HTML body
  };

  // Send the email
  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error };
  }
};

export default sendEmail;