// src/workers/printing/types.ts
import { BaseJobData } from "../registry";

export interface PrintingJobData extends BaseJobData {
  gcodeFileKey: string;
  designId: string;
}
