declare module "expo-file-system" {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;

  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: "utf8" | "base64" | string }
  ): Promise<string>;

  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: "utf8" | "base64" | string }
  ): Promise<void>;

  export function moveAsync(options: { from: string; to: string }): Promise<void>;

  export function deleteAsync(
    fileUri: string,
    options?: { idempotent?: boolean }
  ): Promise<void>;

  export const StorageAccessFramework: {
    requestDirectoryPermissionsAsync: () => Promise<{
      granted: boolean;
      directoryUri: string;
    }>;
    createFileAsync: (
      directoryUri: string,
      fileName: string,
      mimeType: string
    ) => Promise<string>;
  };
}

export { };
