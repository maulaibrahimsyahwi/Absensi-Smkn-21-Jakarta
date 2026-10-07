import React from "react";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "../ui/Sheet";
import Button from "../ui/Button";
import Field, { INPUT_CLASS } from "../ui/Field";
import SegmentedControl from "../ui/SegmentedControl";
import KelasPicker from "./KelasPicker";
import { isValidKelas } from "../../utils/kelas";
import { Siswa } from "../../types/siswa";
import { DropdownGroup } from "../CustomDropdown";

export interface EditSiswaModalProps {
  editingSiswa: Siswa | null;
  setEditingSiswa: (siswa: Siswa | null) => void;
  handleUpdateSiswa: (e: React.FormEvent) => void;
  groups?: DropdownGroup[];
  siswaList?: Siswa[];
}

export default function EditSiswaModal({
  editingSiswa: s,
  setEditingSiswa,
  handleUpdateSiswa,
  groups,
  siswaList = [],
}: EditSiswaModalProps) {
  const valid = Boolean(
    s &&
      s.nis.length >= 4 &&
      s.nama.trim().length >= 3 &&
      isValidKelas(s.kelas || ""),
  );

  return (
    <Sheet
      isOpen={Boolean(s)}
      onClose={() => setEditingSiswa(null)}
      size="md"
      labelledBy="edit-siswa-title"
    >
      {s && (
        <form
          onSubmit={handleUpdateSiswa}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetHeader
            id="edit-siswa-title"
            title="Edit data siswa"
            subtitle={`${s.nama} (${s.kelas})`}
            onClose={() => setEditingSiswa(null)}
          />
          <SheetBody>
            <div className="space-y-4">
              <Field
                label="Nomor Induk Siswa (NIS)"
                required
                hint="4-18 digit angka. NIS digunakan sebagai nama pengguna login siswa."
              >
                <input
                  inputMode="numeric"
                  maxLength={18}
                  minLength={4}
                  required
                  value={s.nis}
                  className={`${INPUT_CLASS} font-mono`}
                  onChange={(e) =>
                    setEditingSiswa({
                      ...s,
                      nis: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </Field>

              <Field label="Nama lengkap" required>
                <input
                  required
                  minLength={3}
                  value={s.nama}
                  className={INPUT_CLASS}
                  onChange={(e) =>
                    setEditingSiswa({ ...s, nama: e.target.value })
                  }
                />
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-bold text-slate-700">
                  Jenis kelamin <span className="text-rose-500">*</span>
                </p>
                <SegmentedControl
                  ariaLabel="Jenis kelamin"
                  value={
                    (s.jenis_kelamin || "Laki-laki") as "Laki-laki" | "Perempuan"
                  }
                  onChange={(v) =>
                    setEditingSiswa({ ...s, jenis_kelamin: v })
                  }
                  options={[
                    { value: "Laki-laki", label: "Laki-laki (Siswa)" },
                    { value: "Perempuan", label: "Perempuan (Siswi)" },
                  ]}
                />
              </div>

              <KelasPicker
                value={s.kelas || ""}
                onChange={(kelas) => setEditingSiswa({ ...s, kelas })}
                siswaList={siswaList}
                groups={groups}
                resetKey={s.id}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditingSiswa(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={!valid}>
              Simpan perubahan
            </Button>
          </SheetFooter>
        </form>
      )}
    </Sheet>
  );
}
