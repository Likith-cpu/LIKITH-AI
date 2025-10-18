
export type AspectRatio = "16:9" | "9:16";
export type Resolution = "720p" | "1080p";

export interface VideoConfig {
  aspectRatio: AspectRatio;
  resolution: Resolution;
}
