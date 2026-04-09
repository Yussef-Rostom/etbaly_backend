import { env } from "#src/configs/envConfig";

export class AiService {
  private static lightningUrl: string = env.LIGHTNING_URL || "";

  static getLightningUrl(): string {
    return this.lightningUrl;
  }

  static setLightningUrl(url: string): string {
    this.lightningUrl = url;
    console.log("Lightning URL updated to:", this.lightningUrl);
    return this.lightningUrl;
  }
}
