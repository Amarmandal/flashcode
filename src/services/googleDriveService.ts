import { CloudBackupItem } from '../types/storage';

export const googleDriveService = {
  /**
   * Lists backup files stored in Google Drive AppData folder
   */
  async listBackups(accessToken: string): Promise<CloudBackupItem[]> {
    if (!accessToken) {
      throw new Error('Not authenticated with Google Drive. Please sign in with Google.');
    }

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,size,createdTime)&orderBy=createdTime desc',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
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

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', new Blob([bytes], { type: 'application/x-sqlite3' }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
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

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
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

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to delete backup from Google Drive (${response.status}): ${errText}`);
    }

    return true;
  },
};
