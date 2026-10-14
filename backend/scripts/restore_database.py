#!/usr/bin/env python3
"""
CLI Script: Pemulihan Basis Data (Database Restore) SMKN 21 Jakarta
Menjalankan pemulihan data dari berkas snapshot JSON atau arsip ZIP.
Dapat dijalankan langsung melalui terminal / command prompt:
    python backend/scripts/restore_database.py [nama_atau_path_file_backup] [--mode replace] [--yes]
"""

import os
import sys
import argparse

# Setup path ke backend root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, '.env'))

from app import app
from utils.backup_utils import restore_db_from_backup, list_db_backups, BACKUP_DIR


def main():
    parser = argparse.ArgumentParser(description="SMKN 21 Jakarta - Database Restore Tool")
    parser.add_argument("backup_file", nargs="?", default=None, help="Nama berkas cadangan (.json/.zip) atau path absolut.")
    parser.add_argument("--mode", choices=["replace", "merge"], default="replace", help="Mode restore: 'replace' (default) atau 'merge'.")
    parser.add_argument("-y", "--yes", action="store_true", help="Lewati konfirmasi peringatan.")
    args = parser.parse_args()

    print("====================================================================")
    print("   SMKN 21 JAKARTA - PEMULIHAN BASIS DATA (DISASTER RECOVERY)")
    print("====================================================================")

    backup_target = args.backup_file
    if not backup_target:
        print("[INFO] Mencari cadangan terbaru di folder backups/ ...")
        res = list_db_backups()
        backups = res.get("backups", [])
        if not backups:
            print("[ERROR] Tidak ditemukan berkas cadangan di folder:", BACKUP_DIR)
            sys.exit(1)

        print("\nDaftar berkas cadangan yang tersedia:")
        for idx, b in enumerate(backups[:10], 1):
            arch_label = " [ZIP Archive]" if b.get('is_archive') else " [JSON Snapshot]"
            print(f"  {idx}. {b['filename']} ({b['size_kb']} KB, {b['created_at']}){arch_label}")

        selected = backups[0]['filename']
        print(f"\nBerkas terpilih otomatis (terbaru): {selected}")
        backup_target = selected

    if not args.yes:
        print(f"\n[PERINGATAN] Mode yang dipilih: '{args.mode.upper()}'")
        if args.mode == "replace":
            print("Mode 'replace' akan MENGHAPUS seluruh tabel transaksi & master saat ini dan menggantinya dengan snapshot cadangan!")
        confirm = input(f"Ketik 'YA' untuk melanjutkan pemulihan dari {os.path.basename(backup_target)}: ").strip()
        if confirm != "YA":
            print("[BATAL] Operasi pemulihan dibatalkan oleh pengguna.")
            sys.exit(0)

    print(f"\n[1/2] Menghubungkan ke basis data dan membaca {backup_target}...")
    with app.app_context():
        result = restore_db_from_backup(backup_target, mode=args.mode)
        if not result.get("success"):
            print(f"\n[ERROR] Pemulihan gagal: {result.get('message')}")
            sys.exit(1)

        print("\n====================================================================")
        print("   PEMULIHAN BERHASIL DISELESAIKAN!")
        print("====================================================================")
        print(f"Berkas Sumber     : {result.get('filename')}")
        print(f"Mode Pemulihan    : {result.get('mode')}")
        print(f"Total Baris Data  : {result.get('total_restored')} rekaman")
        print(f"Upload Fisik      : {result.get('extracted_uploads', 0)} berkas diekstrak")
        print(f"Sequence Reset    : {result.get('sequences_reset', 0)} urutan ID PostgreSQL diperbarui")
        print("\nRincian per Tabel:")
        for tbl, cnt in result.get("restored_tables", {}).items():
            print(f"  - {tbl:<22}: {cnt} baris")
        print("====================================================================\n")


if __name__ == '__main__':
    main()

