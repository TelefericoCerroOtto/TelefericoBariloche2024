export type CvStorageDriver = "local" | "gcs";

export type StoredCvFile = {
  objectKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  storageProvider: CvStorageDriver;
  bucket?: string;
};

export type CvStorageDownloadOptions = {
  expiresInSeconds?: number;
};

export type CvStorage = {
  driver: CvStorageDriver;
  bucket?: string;
  save(_file: File): Promise<StoredCvFile>;
  getReadableStream(
    _objectKey: string,
  ): Promise<ReadableStream | NodeJS.ReadableStream>;
  delete(_objectKey: string): Promise<void>;
  getDownloadUrl?(
    _objectKey: string,
    _options?: CvStorageDownloadOptions,
  ): Promise<string>;
};
