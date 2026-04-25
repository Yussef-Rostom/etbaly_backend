// src/workers/slicing/types.ts
import { BaseJobData } from "../registry";

export interface SlicingJobData extends BaseJobData {
  stlUrl: string;
  designId: string;
  material: string;
  preset?: 'heavy' | 'normal' | 'draft';
  scale?: number;
}
