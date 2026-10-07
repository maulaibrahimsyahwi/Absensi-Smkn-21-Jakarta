import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { PRIVACY } from "../constants/privacy";
import { SCHOOL_PROFILE } from "../constants/schoolProfile";

/**
 * Ubah ke false setelah Kepala Sekolah menandatangani dan nomor dokumen resmi terbit.
 * Selama true: banner draf tampil, nomor dokumen dan blok pengesahan disembunyikan,
 * dan isian yang masih kosong ditandai kuning.
 */
const DRAFT = PRIVACY.draft; // diatur di constants/privacy.ts

/** Bersumber dari constants/schoolProfile agar satu sumber dengan kop PDF di exportUtils. */
const SCHOOL = {
  ...SCHOOL_PROFILE,
  kontak: PRIVACY.kontak,
  masaHapus: PRIVACY.masaHapus,
};

/** Matikan jika antrean offline kiosk tidak menyimpan foto, agar Pasal 3 ayat (3) tidak tampil. */
const FITUR = { fotoOfflineSementara: PRIVACY.fotoOfflineSementara };

/** Menampilkan isian; di mode draf yang kosong ditandai, di mode final yang kosong dihilangkan. */
function Isi({ value, label, awal = "" }: { value?: string; label: string; awal?: string }) {
  if (value) return <>{awal}{value}</>;
  return DRAFT ? (
    <>
      {awal}
      <mark className="rounded-sm bg-amber-100 px-1 text-amber-900">[{label}]</mark>
    </>
  ) : null;
}

const Ayat = ({ children }: { children: React.ReactNode }) => (
  <ol className="list-decimal space-y-3 pl-6 marker:text-slate-400">{children}</ol>
);

const Huruf = ({ children }: { children: React.ReactNode }) => (
  <ol className="mt-2 list-[lower-alpha] space-y-1.5 pl-6 marker:text-slate-400">{children}</ol>
);

interface Pasal {
  id: string;
  judul: string;
  isi: React.ReactNode;
}

const PASAL: Pasal[] = [
  {
    id: "dasar-hukum",
    judul: "Dasar hukum dan pengendali data",
    isi: (
      <Ayat>
        <li>
          {SCHOOL.nama} (selanjutnya disebut Sekolah) bertindak sebagai Pengendali Data Pribadi atas
          data yang diproses melalui Sistem Presensi.
        </li>
        <li>
          Kebijakan ini disusun berdasarkan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data
          Pribadi (UU PDP).
        </li>
        <li>
          Data biometrik termasuk data pribadi yang bersifat spesifik (Pasal 4 ayat (2) huruf b UU PDP).
          Karena itu Sekolah memberlakukan pembatasan akses dan pengamanan yang lebih ketat daripada
          untuk data pribadi biasa.
        </li>
      </Ayat>
    ),
  },
  {
    id: "data-diproses",
    judul: "Data yang diproses",
    isi: (
      <>
        <p>Sistem Presensi memproses data berikut.</p>
        <Huruf>
          <li>Identitas: NIS, nama, dan kelas.</li>
          <li>
            Presensi: waktu dan status kehadiran, serta koordinat lokasi saat presensi mandiri atau
            pengajuan izin.
          </li>
          <li>Wajah: foto profil dan vektor wajah (lihat Pasal 3).</li>
          <li>Tanda tangan digital guru dan siswa yang dipakai pada surat izin dan catatan tata tertib.</li>
          <li>Catatan izin, kunjungan perpustakaan, serta pelanggaran dan prestasi siswa.</li>
        </Huruf>
      </>
    ),
  },
  {
    id: "pengenalan-wajah",
    judul: "Cara kerja pengenalan wajah",
    isi: (
      <Ayat>
        <li>
          Saat pendaftaran, foto wajah diolah model SFace menjadi vektor berisi 128 angka. Vektor inilah
          yang dicocokkan saat presensi.
        </li>
        <li>
          Pada presensi harian, gambar dari kamera dipakai untuk pencocokan lalu dihapus dari memori.
          Gambar itu tidak disimpan sebagai arsip kehadiran.
        </li>
        {FITUR.fotoOfflineSementara && (
          <li>
            Bila jaringan terputus, perangkat kiosk menyimpan foto sementara di perangkat itu sendiri
            sampai dapat dikirim ke server untuk diverifikasi. Foto dihapus setelah terkirim, dan paling
            lama disimpan 24 jam.
          </li>
        )}
        <li>
          Vektor wajah tidak dapat dibuka sebagai gambar. Meski begitu, vektor tetap diperlakukan sebagai
          data biometrik dan dilindungi sama ketatnya dengan foto.
        </li>
        <li>
          Foto profil disimpan terpisah dari vektor wajah dan hanya dipakai untuk kartu pelajar dan
          verifikasi oleh staf.
        </li>
      </Ayat>
    ),
  },
  {
    id: "tujuan",
    judul: "Tujuan dan batasan pemrosesan",
    isi: (
      <Ayat>
        <li>
          Data diproses hanya untuk:
          <Huruf>
            <li>memverifikasi kehadiran harian peserta didik;</li>
            <li>mencegah presensi titipan dan manipulasi lokasi;</li>
            <li>mencatat kunjungan perpustakaan dan izin melalui Guru Piket;</li>
            <li>menyusun rekap kehadiran untuk pelaporan kepada Dinas Pendidikan dan Dapodik.</li>
          </Huruf>
        </li>
        <li>
          Data tidak dijual, disewakan, atau diberikan kepada pihak komersial maupun biro periklanan.
          Pemberian data kepada instansi pemerintah hanya dilakukan untuk kewajiban pelaporan pendidikan
          atau atas dasar ketentuan peraturan perundang-undangan.
        </li>
        <li>Data tidak dipakai untuk tujuan lain di luar yang tercantum di atas.</li>
      </Ayat>
    ),
  },
  {
    id: "persetujuan",
    judul: "Persetujuan dan pengecualian",
    isi: (
      <Ayat>
        <li>
          Pemrosesan data pribadi peserta didik di bawah 18 tahun memerlukan persetujuan orang tua atau
          wali (Pasal 25 UU PDP). Persetujuan dihimpun saat pendaftaran peserta didik.
        </li>
        <li>
          Peserta didik yang tidak dapat memakai pengenalan wajah, misalnya karena luka di wajah, perban,
          atau pasca operasi, dikecualikan. Kehadirannya dicatat secara manual oleh Guru Piket.
        </li>
        <li>
          Orang tua atau wali dapat menarik persetujuan (Pasal 9 UU PDP). Setelah itu, kehadiran peserta
          didik yang bersangkutan dicatat secara manual oleh Guru Piket.
        </li>
      </Ayat>
    ),
  },
  {
    id: "keamanan",
    judul: "Keamanan data",
    isi: (
      <Ayat>
        <li>Komunikasi antara perangkat dan server memakai HTTPS (TLS).</li>
        <li>
          Basis data tidak dapat diakses langsung dari jaringan publik. Akses hanya melalui layanan
          server yang terotentikasi.
        </li>
        <li>Hak akses dibedakan menurut peran: siswa, Guru Piket, dan administrator.</li>
        <li>
          Perubahan data oleh petugas, termasuk koreksi dan pengaturan ulang data wajah, dicatat dalam
          jejak audit.
        </li>
      </Ayat>
    ),
  },
  {
    id: "hak",
    judul: "Hak peserta didik dan orang tua atau wali",
    isi: (
      <>
        <p>Peserta didik dan orang tua atau wali berhak atas hal-hal berikut (Pasal 5 sampai 13 UU PDP).</p>
        <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {[
            ["Informasi", "Mengetahui bagaimana data diproses, termasuk melalui dokumen ini."],
            [
              "Pembaruan dan koreksi",
              "Meminta perekaman ulang vektor wajah bila penampilan berubah, misalnya karena kacamata baru atau pertumbuhan usia, dan meminta perbaikan data yang keliru.",
            ],
            ["Penghapusan", "Meminta data wajah dihapus. Ketentuan penyimpanannya ada di Pasal 8."],
            ["Penarikan persetujuan", "Lihat Pasal 5 ayat (3)."],
            ["Dispensasi medis", "Lihat Pasal 5 ayat (2)."],
          ].map(([istilah, uraian]) => (
            <div key={istilah} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="font-semibold text-slate-900">{istilah}</dt>
              <dd>{uraian}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">Permintaan diajukan sesuai Pasal 9 ayat (2).</p>
      </>
    ),
  },
  {
    id: "penyimpanan",
    judul: "Penyimpanan dan penghapusan",
    isi: (
      <Ayat>
        <li>Selama berstatus siswa aktif, vektor wajah disimpan untuk keperluan presensi.</li>
        <li>
          Ketika siswa lulus atau pindah sekolah, vektor wajah dinonaktifkan dari pemindai aktif, lalu
          dihapus
          <Isi value={SCHOOL.masaHapus} label="batas waktu penghapusan" awal=" paling lambat " />.
        </li>
        <li>
          Rekap kehadiran, tanpa data wajah, disimpan sebagai arsip sekolah sesuai ketentuan retensi arsip
          yang berlaku.
        </li>
      </Ayat>
    ),
  },
  {
    id: "insiden",
    judul: "Insiden, pengaduan, dan perubahan",
    isi: (
      <Ayat>
        <li>
          Bila terjadi kegagalan pelindungan data pribadi, Sekolah memberi tahu secara tertulis peserta
          didik atau wali yang terdampak, dan lembaga yang berwenang, dalam batas waktu yang ditentukan UU
          PDP.
        </li>
        <li>
          Pertanyaan, permintaan, dan pengaduan mengenai data pribadi disampaikan kepada Tata Usaha
          <Isi value={SCHOOL.kontak} label="kontak pengendali data" awal=", " />.
        </li>
        <li>Kebijakan ini dapat diperbarui. Versi terbaru selalu tersedia di halaman ini.</li>
      </Ayat>
    ),
  },
];

function DaftarIsi() {
  return (
    <ol className="space-y-0.5 text-sm">
      {PASAL.map((p, i) => (
        <li key={p.id}>
          <a
            href={`#${p.id}`}
            className="flex gap-2 rounded px-1 py-1.5 text-slate-600 hover:text-slate-900 hover:underline"
          >
            <span className="w-12 shrink-0 text-slate-400">Pasal {i + 1}</span>
            <span>{p.judul}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function KebijakanPrivasi(): React.JSX.Element {
  const navigate = useNavigate();
  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/", { replace: true });

  return (
    <div className="min-h-dvh bg-white text-slate-800">
      <header className="border-b border-slate-200 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 print:max-w-none print:p-0">
        {/* Kop */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {SCHOOL.provinsi || "Pemerintah Provinsi Daerah Khusus Ibukota Jakarta"}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {SCHOOL.dinas || "Dinas Pendidikan"}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">{SCHOOL.nama}</p>
          <p className="mt-1 text-xs text-slate-500">
            {SCHOOL.alamat}. Telp. {SCHOOL.telepon}. NPSN {SCHOOL.npsn}.
          </p>
          <hr className="mt-3 border-0 border-t-4 border-double border-slate-700" />

          <h1 className="mt-8 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Kebijakan Privasi dan Pelindungan Data Biometrik Peserta Didik
          </h1>
          <p className="mt-1 text-sm text-slate-600">Sistem Presensi {SCHOOL.nama}</p>
        </div>

        <dl className="mx-auto mt-8 grid max-w-2xl gap-x-6 gap-y-1.5 border-y border-slate-200 py-4 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Dasar hukum</dt>
          <dd>UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi</dd>
          {!DRAFT && (
            <>
              <dt className="text-slate-500">Nomor dokumen</dt>
              <dd>{SCHOOL.nomorDokumen}</dd>
            </>
          )}
          <dt className="text-slate-500">Status</dt>
          <dd>{DRAFT ? "Draf" : `Berlaku untuk ${SCHOOL.berlaku}`}</dd>
        </dl>

        {DRAFT && (
          <p
            role="note"
            className="mx-auto mt-4 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            Draf. Dokumen ini belum disahkan Kepala Sekolah dan belum bernomor resmi. Isian bertanda
            kurung siku masih harus dilengkapi.
          </p>
        )}

        <div className="mt-10 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14 print:block">
          <aside className="print:hidden">
            <details className="rounded-lg border border-slate-200 lg:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-slate-700">
                Daftar isi
              </summary>
              <nav aria-label="Daftar isi" className="border-t border-slate-200 p-2">
                <DaftarIsi />
              </nav>
            </details>
            <nav aria-label="Daftar isi" className="hidden lg:sticky lg:top-8 lg:block">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Isi dokumen
              </p>
              <DaftarIsi />
            </nav>
          </aside>

          <article className="mt-8 max-w-[40rem] space-y-10 text-[15px] leading-7 text-slate-700 lg:mt-0 print:mt-6 print:text-[11pt]">
            {PASAL.map((p, i) => (
              <section key={p.id} id={p.id} aria-labelledby={`${p.id}-judul`} className="scroll-mt-6">
                <p className="text-sm font-semibold text-slate-500">Pasal {i + 1}</p>
                <h2 id={`${p.id}-judul`} className="text-lg font-bold text-slate-900">
                  {p.judul}
                </h2>
                <div className="mt-3">{p.isi}</div>
              </section>
            ))}

            {!DRAFT && (
              <section className="break-inside-avoid border-t border-slate-200 pt-8">
                <p>Ditetapkan di Jakarta.</p>
                <div className="mt-6 grid grid-cols-2 gap-6 text-center text-sm">
                  {[
                    ["Mengetahui, Wakil Kepala Sekolah Bidang Kesiswaan", SCHOOL.wakasek],
                    ["Kepala Sekolah", SCHOOL.kepsek],
                  ].map(([jabatan, orang]) => {
                    const o = orang as { nama: string; nip: string };
                    return (
                      <div key={jabatan as string}>
                        <p>{jabatan as string}</p>
                        <div className="h-20" />
                        <p className="font-semibold text-slate-900 underline">
                          {o.nama || "............................"}
                        </p>
                        <p className="text-slate-500">NIP {o.nip}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
