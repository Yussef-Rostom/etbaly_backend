import { env } from "#src/configs/envConfig";

export const emailConfig = {
  service: "gmail",
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
};
