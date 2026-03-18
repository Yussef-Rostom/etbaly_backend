import { google } from "googleapis";
import { env } from "#src/configs/envConfig";

const oauth2Client = new google.auth.OAuth2(
  env.DRIVE_CLIENT_ID,
  env.DRIVE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: env.DRIVE_REFRESH_TOKEN,
});

export const drive = google.drive({ version: "v3", auth: oauth2Client });
