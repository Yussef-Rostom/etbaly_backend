import nodemailer from "nodemailer";
import { emailConfig } from "@/configs/emailConfig";

const transporter = nodemailer.createTransport(emailConfig);

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<any> => {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to,
      subject,
      text,
      html,
    };

    // TODO: Uncomment when email service is ready
    // const info = await transporter.sendMail(mailOptions);
    // return info;

    console.log(mailOptions);
    return "Email sent successfully";
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
