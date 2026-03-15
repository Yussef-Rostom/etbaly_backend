import { ManufacturingJob } from "../../../models/ManufacturingJob";

export class ManufacturingService {
  /**
   * Updates the status of a Manufacturing Job in the database.
   *
   * @param jobId The MongoDB ObjectId of the job.
   * @param status The new status string.
   * @param gcodeUrl Optional final G-code URL.
   */
  public static async updateJobStatus(
    jobId: string,
    status: "Queued" | "Slicing" | "Printing" | "Done" | "Failed",
    gcodeUrl?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      ...(status === "Done" || status === "Failed"
        ? { finishedAt: new Date() }
        : {}),
    };

    if (gcodeUrl) {
      updateData.gcodeUrl = gcodeUrl;
    }

    await ManufacturingJob.findByIdAndUpdate(jobId, updateData);
  }

  /**
   * Simulates slicing process for 5 seconds.
   * Replace this with actual PrusaSlicer/child_process calls in production.
   *
   * @param fileName The original 3D file name to define the output URL.
   * @returns Resolves the dummy gcode string url.
   */
  public static simulateSlicing(fileName: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const gcodeUrl = `https://storage.etb3haly.com/gcode/${Date.now()}_${fileName.replace(/\.\w+$/, ".gcode")}`;
        resolve(gcodeUrl);
      }, 5_000);
    });
  }
}
