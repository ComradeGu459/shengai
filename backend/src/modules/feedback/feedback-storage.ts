export type FeedbackScreenshotStorageInfo = Readonly<{
  sizeBytes: number;
  contentDigest: string;
}>;

export type FeedbackScreenshotStoredObject = FeedbackScreenshotStorageInfo & Readonly<{
  contentType: string;
  bytes: Uint8Array;
}>;

export interface FeedbackScreenshotStorage {
  authorize(input: { objectKey: string; contentType: string; sizeBytes: number; contentDigest: string }): Promise<void>;
  upload(input: { objectKey: string; contentType: string; bytes: Uint8Array }): Promise<void>;
  complete(input: { objectKey: string; contentType: string; sizeBytes: number; contentDigest: string }): Promise<FeedbackScreenshotStorageInfo>;
  read(input: { objectKey: string }): Promise<FeedbackScreenshotStoredObject>;
}
