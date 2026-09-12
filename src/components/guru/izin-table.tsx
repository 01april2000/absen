"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, NotebookPen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createIzin, createTitipTugas, deleteIzin, deleteTitipTugas } from "@/app/guru/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";
import { DynamicBlockNoteEditor } from "@/components/editor/dynamic-editor";
import { cn } from "@/lib/utils";

export type IzinRow = {
  id: number;
  jenis: string;
  tanggal: Date;
  keterangan: string | null;
  status: string;
};

export type KelasOption = {
  id: number;
  nama_kelas: string;
};

export type JadwalOption = {
  id: number;
  hari: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  mapel: { nama_mapel: string } | null;
  kelas: { id: number; nama_kelas: string } | null;
};

export type TitipTugasRow = {
  id: number;
  izin_id: number;
  kelas_id: number;
  jadwal_id: number;
  status: string;
};

type IzinTableProps = {
  rows: IzinRow[];
  kelasOptions: KelasOption[];
  jadwalOptions: JadwalOption[];
  titipTugas: TitipTugasRow[];
};

const HARI_INDEX = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

const statusBadge = (status: string) =>
  cn(
    "rounded-full px-2 py-0.5 text-xs font-medium",
    status === "Menunggu" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    status === "Disetujui" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    status === "Ditolak" && "bg-rose-500/10 text-rose-700 dark:text-rose-400"
  );

export function IzinTable({
  rows,
  kelasOptions,
  jadwalOptions,
  titipTugas,
}: IzinTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<IzinRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [jenis, setJenis] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [titipFor, setTitipFor] = useState<IzinRow | null>(null);
  const [kelasId, setKelasId] = useState("");
  const [jadwalId, setJadwalId] = useState("");
  const [konten, setKonten] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [titipError, setTitipError] = useState<string | null>(null);

  const hariIzin = titipFor ? HARI_INDEX[titipFor.tanggal.getDay()] : null;
  const filteredJadwal = jadwalOptions.filter(
    (j) => j.kelas?.id === Number(kelasId) && j.hari === hariIzin
  );
  const existingTitip = titipFor
    ? titipTugas.filter((t) => t.izin_id === titipFor.id)
    : [];

  function openCreate() {
    setError(null);
    setJenis("");
    setTanggal("");
    setKeterangan("");
    setDialogOpen(true);
  }

  function openTitip(row: IzinRow) {
    setTitipError(null);
    setTitipFor(row);
    setKelasId("");
    setJadwalId("");
    setKonten("");
    setResetKey((prev) => prev + 1);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("jenis", jenis);
    formData.set("tanggal", tanggal);
    formData.set("keterangan", keterangan);

    startTransition(async () => {
      const result = await createIzin(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteIzin(deleting.id);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setDeleting(null);
        router.refresh();
      }
    });
  }

  function handleTitipSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!titipFor) return;

    const formData = new FormData();
    formData.set("izin_id", String(titipFor.id));
    formData.set("kelas_id", kelasId);
    formData.set("jadwal_id", jadwalId);
    formData.set("konten", konten);

    startTransition(async () => {
      const result = await createTitipTugas(formData);
      if (result?.error) {
        setTitipError(result.error);
      } else {
        setTitipError(null);
        setKelasId("");
        setJadwalId("");
        setKonten("");
        setResetKey((prev) => prev + 1);
        router.refresh();
      }
    });
  }

  function handleTitipDelete(id: number) {
    startTransition(async () => {
      const result = await deleteTitipTugas(id);
      if (result?.error) {
        setTitipError(result.error);
      } else {
        setTitipError(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-medium">Izin/Sakit</h2>
            <p className="text-sm text-muted-foreground">{rows.length} catatan izin/sakit</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <CalendarPlus />
            Catat Izin/Sakit
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada catatan izin/sakit
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        row.jenis === "Izin" &&
                          "bg-sky-500/10 text-sky-700 dark:text-sky-400",
                        row.jenis === "Sakit" &&
                          "bg-violet-500/10 text-violet-700 dark:text-violet-400"
                      )}
                    >
                      {row.jenis}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(row.tanggal)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {row.keterangan ?? "-"}
                  </TableCell>
                  <TableCell>
                    <span className={statusBadge(row.status)}>{row.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Titip Tugas"
                        onClick={() => openTitip(row)}
                      >
                        <NotebookPen />
                        <span className="sr-only">Titip Tugas</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => {
                          setError(null);
                          setDeleting(row);
                        }}
                      >
                        <Trash2 />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Izin/Sakit</DialogTitle>
            <DialogDescription>Tambahkan catatan izin atau sakit baru.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Jenis</label>
              <Select value={jenis} onValueChange={(v) => setJenis(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Izin">Izin</SelectItem>
                  <SelectItem value="Sakit">Sakit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FormField
              label="Tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
            <FormField
              label="Keterangan (opsional)"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Alasan izin/sakit"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={titipFor !== null}
        onOpenChange={(open) => {
          if (!open) setTitipFor(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Titip Tugas</DialogTitle>
            <DialogDescription>
              {titipFor
                ? `Untuk ${titipFor.jenis} tanggal ${formatDate(titipFor.tanggal)}`
                : "Isi tugas untuk pengganti saat berhalangan."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTitipSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Kelas</label>
              <Select
                value={kelasId}
                onValueChange={(v) => {
                  setKelasId(v ?? "");
                  setJadwalId("");
                  setTitipError(null);
                }}
                itemToStringLabel={(value) =>
                  kelasOptions.find((k) => String(k.id) === value)?.nama_kelas ?? value
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {kelasOptions.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Tidak ada kelas yang diajar
                    </SelectItem>
                  ) : (
                    kelasOptions.map((k) => (
                      <SelectItem key={k.id} value={String(k.id)}>
                        {k.nama_kelas}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Jadwal Mengajar</label>
              <Select
                value={jadwalId}
                onValueChange={(v) => setJadwalId(v ?? "")}
                disabled={!kelasId}
                itemToStringLabel={(value) => {
                  const j = filteredJadwal.find((x) => String(x.id) === value);
                  return j
                    ? `${j.mapel?.nama_mapel ?? "-"} • ${j.jam_mulai ?? "-"}–${j.jam_selesai ?? "-"}`
                    : value;
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      kelasId
                        ? filteredJadwal.length === 0
                          ? "Tidak ada jadwal pada hari tersebut"
                          : "Pilih jadwal"
                        : "Pilih kelas terlebih dahulu"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredJadwal.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Tidak ada jadwal
                    </SelectItem>
                  ) : (
                    filteredJadwal.map((j) => (
                      <SelectItem key={j.id} value={String(j.id)}>
                        {j.mapel?.nama_mapel ?? "-"} • {j.jam_mulai ?? "-"}–
                        {j.jam_selesai ?? "-"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Tugas untuk Siswa</label>
              <DynamicBlockNoteEditor
                onChange={setKonten}
                resetKey={resetKey}
              />
            </div>

            {existingTitip.length > 0 && (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Tugas yang sudah dititipkan</label>
                <ul className="flex flex-col divide-y rounded-md border">
                  {existingTitip.map((t) => {
                    const j = jadwalOptions.find((x) => x.id === t.jadwal_id);
                    const kelas = kelasOptions.find((k) => k.id === t.kelas_id);
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {j?.mapel?.nama_mapel ?? "-"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {kelas?.nama_kelas ?? "-"}
                            {j?.jam_mulai ? ` • ${j.jam_mulai}–${j.jam_selesai}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={statusBadge(t.status)}>{t.status}</span>
                          {t.status === "Menunggu" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              onClick={() => handleTitipDelete(t.id)}
                              disabled={isPending}
                            >
                              <Trash2 />
                              <span className="sr-only">Hapus titip tugas</span>
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {titipError && <p className="text-sm text-destructive">{titipError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTitipFor(null)}
              >
                Tutup
              </Button>
              <Button type="submit" disabled={isPending || !kelasId || !jadwalId}>
                {isPending ? "Menyimpan..." : "Simpan Titip Tugas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Hapus izin/sakit"
        description={`Yakin ingin menghapus catatan ${deleting?.jenis ?? ""} tanggal ${
          deleting ? formatDate(deleting.tanggal) : "-"
        }? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}