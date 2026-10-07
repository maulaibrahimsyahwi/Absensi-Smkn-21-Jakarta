/**
 * Utilitas pembantu untuk mengunduh Blob berkas (PDF, Excel, CSV) secara aman di peramban.
 * Menunda pencabutan object URL (revokeObjectURL) selama 1 detik agar tidak membatalkan unduhan di Safari/iOS.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

