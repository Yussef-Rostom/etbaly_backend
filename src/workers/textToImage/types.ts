// src/workers/textToImage/types.ts
import { BaseJobData } from "../registry";

export interface TextToImageJobData extends BaseJobData {
  prompt: string;
  designName: string;
}
