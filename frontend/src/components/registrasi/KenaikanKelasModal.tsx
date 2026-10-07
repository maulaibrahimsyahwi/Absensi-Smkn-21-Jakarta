import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import api from "../../services/api";
import { KELAS_GROUPS_DROPDOWN } from "../../constants/schoolData";
import CustomDropdown, { DropdownGroup } from "../CustomDropdown";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "../ui/Sheet";
import Button from "../ui/Button";
import SegmentedControl from "../ui/SegmentedControl";
import InlineAlert from "../ui/InlineAlert";
import ConfirmSheet from "../ui/ConfirmSheet";
import { nextKelas, parseKelas, tingkatIndex } from "../../utils/kelas";
import { Siswa } from "../../types/siswa";

export interface KenaikanKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  siswaList?: Siswa[];
}

const optionValue = (o: unknown) =>
  typeof o === "object" && o !== null
    ? String((o as { value: unknown }).value)
    : String(o);

const filterGroups = (
  groups: DropdownGroup[],
  keep: (kelas: string) => boolean,
): DropdownGroup[] =>
  groups
    .map((g) => ({
      ...g,
      options: (g.options || g.items || []).filter((o) => keep(optionValue(o))),
    }))
    .filter((g) => g.options.length > 0);

export default function KenaikanKelasModal({
  isOpen,
  onClose,
  onSuccess,
  siswaList = [],
}: KenaikanKelasModalProps) {
  const [aksi, setAksi] = useState<"naik_kelas" | "lulus">("naik_kelas");
  const [kelasAsal, setKelasAsal] = useState("");
  const [kelasTujuan, setKelasTujuan] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setAksi("naik_kelas");
    setKelasAsal("");
    setKelasTujuan("");
    setError("");
    setConfirmOpen(false);
  }, [isOpen]);

  const asal = parseKelas(kelasAsal);
  const tujuan = parseKelas(kelasTujuan);
  const countKnown = siswaList.length > 0;
  const jumlah = useMemo(
    () =>
      siswaList.filter(
        (s) => s.kelas === kelasAsal && s.status !== "Alumni",
      ).length,
    [siswaList, kelasAsal],
  );

  const problem = !asal
    ? "Pilih kelas asal."
    : aksi === "lulus" && asal.tingkat !== "XII"
      ? "Hanya kelas XII yang bisa diluluskan."
      : aksi === "naik_kelas" && asal.tingkat === "XII"
        ? "Kelas XII tidak naik kelas. Pilih Luluskan."
        : aksi === "naik_kelas" && !tujuan
          ? "Pilih kelas tujuan."
          : aksi === "naik_kelas" &&
              tujuan &&
              asal &&
              tingkatIndex(tujuan.tingkat) !== tingkatIndex(asal.tingkat) + 1
            ? "Kelas tujuan harus satu tingkat di atas kelas asal."
            : countKnown && jumlah === 0
              ? "Tidak ada siswa aktif di kelas ini."
              : "";

  const asalGroups = useMemo(
    () =>
      filterGroups(KELAS_GROUPS_DROPDOWN, (k) =>
        aksi === "lulus"
          ? parseKelas(k)?.tingkat === "XII"
          : parseKelas(k)?.tingkat !== "XII",
      ),
    [aksi],
  );

  const tujuanGroups = useMemo(
    () =>
      filterGroups(
        KELAS_GROUPS_DROPDOWN,
        (k) =>
          Boolean(asal) &&
          parseKelas(k)?.tingkat ===
            (nextKelas(kelasAsal)
              ? parseKelas(nextKelas(kelasAsal)!)!.tingkat
              : undefined),
      ),
    [asal, kelasAsal],
  );

  const apply = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/siswa/naik_kelas_massal", {
        kelas_asal: kelasAsal,
        aksi,
        kelas_tujuan: aksi === "naik_kelas" ? kelasTujuan : null,
      });
      if (res.data?.success) {
        onSuccess(res.data.message || "Kenaikan kelas berhasil diproses.");
        setConfirmOpen(false);
        onClose();
      } else {
        setConfirmOpen(false);
        setError(res.data?.message || "Gagal memproses kenaikan kelas.");
      }
    } catch (err: any) {
      setConfirmOpen(false);
      setError(
        err.response?.data?.message ||
          "Terjadi kesalahan saat memproses kenaikan kelas.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} size="md" labelledBy="naik-title">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!problem) setConfirmOpen(true);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetHeader
            id="naik-title"
            title="Kenaikan kelas massal"
            subtitle="Satu rombel sekali proses"
            onClose={onClose}
          />
          <SheetBody>
            <div className="space-y-4">
              {error && <InlineAlert type="error">{error}</InlineAlert>}
              <SegmentedControl
                ariaLabel="Jenis proses"
                value={aksi}
                onChange={(v) => {
                  setAksi(v);
                  setKelasAsal("");
                  setKelasTujuan("");
                }}
                options={[
                  { value: "naik_kelas", label: "Naik kelas" },
                  { value: "lulus", label: "Luluskan (XII)" },
                ]}
              />
              <div>
                <p className="mb-1.5 text-xs font-bold text-slate-700">
                  Kelas asal <span className="text-rose-500">*</span>
                </p>
                <CustomDropdown
                  value={kelasAsal}
                  groups={asalGroups}
                  className="w-full"
                  size="lg"
                  placeholder="Pilih kelas asal..."
                  onChange={(v: string) => {
                    setKelasAsal(v);
                    setKelasTujuan(
                      aksi === "naik_kelas" ? nextKelas(v) ?? "" : "",
                    );
                  }}
                />
                {countKnown && kelasAsal && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    <b className="text-slate-800">{jumlah}</b> siswa aktif akan
                    diproses.
                  </p>
                )}
              </div>
              {aksi === "naik_kelas" && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <ArrowRight className="h-3.5 w-3.5" /> Kelas tujuan{" "}
                    <span className="text-rose-500">*</span>
                  </p>
                  <CustomDropdown
                    value={kelasTujuan}
                    onChange={setKelasTujuan}
                    groups={tujuanGroups}
                    className="w-full"
                    size="lg"
                    placeholder="Pilih kelas tujuan..."
                    disabled={!asal}
                  />
                </div>
              )}
              {kelasAsal && problem && (
                <InlineAlert type="warning">{problem}</InlineAlert>
              )}
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={Boolean(problem)}>
              Tinjau
            </Button>
          </SheetFooter>
        </form>
      </Sheet>

      <ConfirmSheet
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={apply}
        loading={loading}
        title={aksi === "lulus" ? "Luluskan rombel ini?" : "Naikkan rombel ini?"}
        confirmLabel="Terapkan"
        requireText={aksi === "lulus" ? "LULUSKAN" : "NAIK KELAS"}
        danger={aksi === "lulus"}
      >
        <p>
          Semua siswa aktif <b>{kelasAsal}</b>
          {countKnown && <> ({jumlah} siswa)</>}{" "}
          {aksi === "lulus" ? (
            <>
              akan berstatus <b>Alumni</b> dan dinonaktifkan dari pemindaian presensi harian.
            </>
          ) : (
            <>
              akan dipindahkan ke rombel <b>{kelasTujuan}</b>.
            </>
          )}
        </p>
        <InlineAlert type="warning">
          Tindakan ini tidak dapat dibatalkan otomatis. Pastikan cadangan data sudah tersedia sebelum melanjutkan.
        </InlineAlert>
      </ConfirmSheet>
    </>
  );
}
