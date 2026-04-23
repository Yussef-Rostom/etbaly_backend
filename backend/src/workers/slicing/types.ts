// src/workers/slicing/types.ts
import { BaseJobData } from "../registry";

export interface SlicingJobData extends BaseJobData {
  modelFileKey: string;
  designId: string;
  material: string;
}
