import { getAccessToken } from './auth';
import { uploadFileToGas, deleteFileFromGas, deleteFileFromGasDetailed } from './gasClient';

/**
 * Helper to open or download any document attachment safely (handles Google Drive URLs and Data URLs)
 */
export const openDocumentFile = (fileUrl: string, fileName?: string) => {
  if (!fileUrl) return;

  if (fileUrl.startsWith('data:')) {
    try {
      const arr = fileUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'document';
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    } catch (err) {
      console.warn('Error converting data URL to blob:', err);
    }
  }

  window.open(fileUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Uploads a file to Google Drive.
 * 1. Automatically attempts to upload via the configured Google Apps Script Web App directly to Google Drive.
 * 2. If an active OAuth token is already present, it can also use Google Drive REST API.
 * 3. Resilient Fallback: If the user's remote Apps Script is an older deployment that returns
 *    "Action not supported: uploadFile", it safely embeds the file (as data URL) so the user
 *    never experiences an aborted save or lost document.
 */
export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink?: string;
  isLocalFallback?: boolean;
  isPermissionError?: boolean;
  errorDetails?: string;
}

export interface DeleteDriveResult {
  success: boolean;
  isLocalOnly?: boolean;
  error?: string;
  isPermissionError?: boolean;
  message?: string;
}

/**
 * Uploads a file directly to Google Drive
 */
export const uploadFileToGoogleDrive = async (file: File): Promise<DriveUploadResult> => {
  let gasErrorMsg = '';
  let isPermError = false;

  // Prepare Base64 data URL
  const base64Promise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = (e.target?.result as string) || '';
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const base64Data = await base64Promise;

  // Path A: Upload directly via Google Apps Script Web App (Most stable across sandboxed iframes & Cloud Run)
  try {
    const gasRes = await uploadFileToGas(file.name, file.type || 'application/octet-stream', base64Data, 'หนังสือราชการ');

    if (gasRes.success && gasRes.url) {
      const fileIdMatch = gasRes.url.match(/id=([a-zA-Z0-9_-]+)/) || gasRes.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const resolvedFileId = gasRes.fileId || (fileIdMatch ? fileIdMatch[1] : `gas-${Date.now()}`);
      return {
        fileId: resolvedFileId,
        fileName: file.name,
        webViewLink: gasRes.url,
        webContentLink: gasRes.url
      };
    } else if (gasRes.error) {
      gasErrorMsg = gasRes.error;
      if (gasErrorMsg.includes('Access denied') || gasErrorMsg.includes('DriveApp')) {
        isPermError = true;
      }
      console.warn('Google Apps Script Drive upload failed, checking REST API fallback:', gasRes.error);
    }
  } catch (gasUploadErr: any) {
    gasErrorMsg = gasUploadErr?.message || String(gasUploadErr);
    if (gasErrorMsg.includes('Access denied') || gasErrorMsg.includes('DriveApp')) {
      isPermError = true;
    }
    console.warn('GAS upload attempt error:', gasUploadErr);
  }

  // Path B: Fallback to direct Google Drive REST API if accessToken is available in memory
  let accessToken: string | null = null;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.warn('Could not retrieve access token:', err);
  }

  if (accessToken) {
    try {
      const metadata = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        description: 'เอกสารหนังสือราชการ ระบบสารบรรณงานป้องกันฯ'
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const reader = new FileReader();
      const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const fileData = await fileDataPromise;

      const metadataContentType = 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
      const metadataPart = delimiter + metadataContentType + JSON.stringify(metadata) + '\r\n';
      
      const fileContentType = `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
      const fileHeader = delimiter + fileContentType;

      const enc = new TextEncoder();
      const part1 = enc.encode(metadataPart);
      const part2 = enc.encode(fileHeader);
      const part3 = new Uint8Array(fileData);
      const part4 = enc.encode(closeDelimiter);

      const combined = new Uint8Array(part1.length + part2.length + part3.length + part4.length);
      combined.set(part1, 0);
      combined.set(part2, part1.length);
      combined.set(part3, part1.length + part2.length);
      combined.set(part4, part1.length + part2.length + part3.length);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: combined
      });

      if (response.ok) {
        const data = await response.json();

        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone',
            }),
          });
        } catch (permError) {
          console.warn('Could not set public permission on Drive file:', permError);
        }

        const viewUrl = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view?usp=sharing`;

        return {
          fileId: data.id,
          fileName: data.name,
          webViewLink: viewUrl,
          webContentLink: data.webContentLink
        };
      }
    } catch (directErr) {
      console.warn('Direct Drive upload attempt failed:', directErr);
    }
  }

  // Path C: Resilient Fallback - When remote GAS is an older version lacking "uploadFile" or Drive permission is pending
  // Save file locally as Data URL so the document is NEVER lost or aborted
  if (file.size <= 4 * 1024 * 1024) {
    return {
      fileId: `local-doc-${Date.now()}`,
      fileName: file.name,
      webViewLink: base64Data,
      webContentLink: base64Data,
      isLocalFallback: true,
      isPermissionError: isPermError,
      errorDetails: gasErrorMsg
    };
  }

  const errorDetails = gasErrorMsg ? `: ${gasErrorMsg}` : ' กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ URL เว็บแอป';
  throw new Error(`ไม่สามารถอัปโหลดไฟล์ไปยัง Google Drive ได้${errorDetails}`);
};

/**
 * Moves a file to Trash in Google Drive (ย้ายเอกสารไปไว้ในถังขยะ Google Drive - รายละเอียดเต็ม)
 */
export const deleteFileFromGoogleDriveDetailed = async (fileId: string, fileUrl?: string): Promise<DeleteDriveResult> => {
  if (!fileId && !fileUrl) {
    return { success: false, error: 'ไม่พบรหัสหรือลิงก์ไฟล์' };
  }

  // If stored locally as data URL, it was never uploaded to Google Drive
  if ((fileId && fileId.startsWith('local-')) || (fileUrl && fileUrl.startsWith('data:'))) {
    return { 
      success: true, 
      isLocalOnly: true, 
      message: 'ไฟล์นี้ถูกแนบไว้เฉพาะในฐานข้อมูลระบบ (ไม่ได้อยู่บน Google Drive)' 
    };
  }

  // Extract clean Google Drive ID if present
  let driveId = fileId;
  if (!driveId || driveId.startsWith('gas-') || driveId.startsWith('doc-') || driveId.startsWith('file-')) {
    if (fileUrl) {
      const match = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                    fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                    fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        driveId = match[1];
      }
    }
  }

  const accessToken = await getAccessToken().catch(() => null);

  if (accessToken && driveId && !driveId.startsWith('gas-') && !driveId.startsWith('doc-') && !driveId.startsWith('file-')) {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
      });

      if (response.ok || response.status === 404) {
        return { success: true, message: 'ย้ายเอกสารไปไว้ในถังขยะ Google Drive สำเร็จ' };
      }
    } catch (error) {
      console.warn('Direct move to trash in Google Drive failed:', error);
    }
  }

  // Fallback to GAS delete (which calls file.setTrashed(true) on Google Drive)
  try {
    const gasRes = await deleteFileFromGasDetailed(driveId || fileId, fileUrl);
    return {
      success: gasRes.success,
      message: gasRes.message,
      error: gasRes.error,
      isPermissionError: gasRes.isPermissionError
    };
  } catch (gasErr: any) {
    console.warn('GAS move to trash error:', gasErr);
    return {
      success: false,
      error: String(gasErr)
    };
  }
};

/**
 * Moves a file to Trash in Google Drive (ย้ายเอกสารไปไว้ในถังขยะ Google Drive - คืนค่า boolean)
 */
export const deleteFileFromGoogleDrive = async (fileId: string, fileUrl?: string): Promise<boolean> => {
  const result = await deleteFileFromGoogleDriveDetailed(fileId, fileUrl);
  return result.success;
};
