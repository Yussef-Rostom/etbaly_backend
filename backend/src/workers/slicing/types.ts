// src/workers/slicing/types.ts
import { BaseJobData } from "../registry";

export interface SlicingJobData extends BaseJobData {
  stlUrl: string;
  designId: string;
  material: string;
  color?: string;
  preset?: 'heavy' | 'normal' | 'draft';
  /** Scale percentage: 1–1000 (100 = original size) */
  scale?: number;
}
