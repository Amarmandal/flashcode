import { invoke } from '@tauri-apps/api/core';
import { CloudBackupItem } from '../types/storage';
import { SuccessApiResponse } from '../types/successApiResponse';

/**
 * Performs a Drive API request with one automatic retry on 401.
 *
 * If the response is 401 (token rejected by Google despite expiry check),
 * calls force_refresh_access_token with the stale token, then retries once.
 * A second 401 or any 403 (permission error) is not retried.
 */
async function driveRequest(
  url: string,
  init: RequestInit,
  accessToken: string
): Promise<Response> {
  const headers = { ...init.headers as Record<string, string>, Authorization: `Bearer ${accessToken}` };
  const response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    // Token was rejected — attempt one coordinated forced refresh
    let newToken: string;
    try {
      const res = await invoke<SuccessApiResponse<string>>('force_refresh_access_token', {
        staleToken: accessToken,
      });
      newToken = res.data;
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? (err as { message: string }).message
        : String(err);
      throw new Error(`Token refresh failed: ${message}`);
    }

    // Retry once with the new token
    const retryHeaders = { ...init.headers as Record<string, string>, Authorization: `Bearer ${newToken}` };
    const retryResponse = await fetch(url, { ...init, headers: retryHeaders });

    if (!retryResponse.ok) {
      const errText = await retryResponse.text();
      throw new Error(`Google Drive API error after token refresh (${retryResponse.status}): ${errText}`);
    }

    return retryResponse;
  }

  return response;
}

export const googleDriveService = {
  /**
   * Lists backup files stored in Google Drive AppData folder
   */
  async listBackups(accessToken: string): Promise<CloudBackupItem[]> {
    if (!accessToken) {
      throw new Error('Not authenticated with Google Drive. Please sign in with Google.');
    }

    const response = await driveRequest(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,size,createdTime)&orderBy=createdTime desc',
      {},
      accessToken
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive API error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const files = result.files || [];

    return files.map((f: { id: string; name: string; size?: string; createdTime: string }) => ({
      id: f.id,
      name: f.name,
      sizeBytes: parseInt(f.size || '0', 10),
      createdAt: f.createdTime,
      provider: 'google_drive' as const,
    }));
  },

  /**
   * Uploads database backup to Google Drive AppData folder
   */
  async uploadBackup(
    bytes: Uint8Array,
    fileName: string,
    accessToken: string
  ): Promise<CloudBackupItem> {
    if (!accessToken) {
      throw new Error('No Google Drive access token found in OS Keychain. Please re-authenticate.');
    }

    const metadata = {
      name: fileName,
      parents: ['appDataFolder'],
      mimeType: 'application/x-sqlite3',
    };

    const boundary = `flashcode_${crypto.randomUUID()}`;

    const metadataPart =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      '\r\n';

    const mediaHeader =
      `--${boundary}\r\n` +
      'Content-Type: application/x-sqlite3\r\n\r\n';

    const closingBoundary = `\r\n--${boundary}--\r\n`;

    // Copy into an ArrayBuffer-backed array suitable for Blob construction.
    const fileBytes = new Uint8Array(bytes.byteLength);
    fileBytes.set(bytes);

    const body = new Blob([
      metadataPart,
      mediaHeader,
      fileBytes,
      closingBoundary,
    ]);

    const response = await driveRequest(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
      accessToken
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive upload failed (${response.status}): ${errText}`);
    }

    const resJson = await response.json();
    if (!resJson.id) {
      throw new Error('Google Drive upload response missing file ID');
    }

    return {
      id: resJson.id,
      name: fileName,
      sizeBytes: bytes.byteLength,
      createdAt: new Date().toISOString(),
      provider: 'google_drive',
    };
  },

  /**
   * Downloads a backup file from Google Drive
   */
  async downloadBackup(fileId: string, accessToken: string): Promise<Uint8Array> {
    if (!accessToken) {
      throw new Error('Not authenticated with Google. Please log in to download backups.');
    }

    const response = await driveRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {},
      accessToken
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to download backup from Google Drive (${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Downloaded backup file is empty');
    }

    return new Uint8Array(arrayBuffer);
  },

  /**
   * Deletes a backup from Google Drive
   */
  async deleteBackup(fileId: string, accessToken: string): Promise<boolean> {
    if (!accessToken) {
      throw new Error('Not authenticated with Google.');
    }

    const response = await driveRequest(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
    }, accessToken);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to delete backup from Google Drive (${response.status}): ${errText}`);
    }

    return true;
  },
};
