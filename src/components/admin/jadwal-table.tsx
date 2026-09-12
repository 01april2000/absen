"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJadwal, updateJadwal, deleteJadwal } from "@/app/admin/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export type JadwalRow = {
  id: number;
  hari: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  mapel: { id: number; nama_mapel: string } | null;
  guru: { id: number; nama: string } | null;
  kelas: { id: number; nama_kelas: string } | null;
};

type JadwalTableProps = {
  rows: JadwalRow[];
  mapelOptions: { id: number; nama_mapel: string; kode_mapel: string }[];
  guruOptions: { id: number; nama: string }[];
  kelasOptions: { id: number; nama_kelas: string }[];
};

export function JadwalTable({ rows, mapelOptions, guruOptions, kelasOptions }: JadwalTableProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JadwalRow | null>(null);
  const [deleting, setDeleting] = useState<JadwalRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [hari, setHari] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");

  function openCreate() {
    setError(null);
    setEditing(null);
    setMapelId("");
    setGuruId("");
    setKelasId("");
    setHari("");
    setJamMulai("");
    setJamSelesai("");
    setDialogOpen(true);
  }

  function openEdit(row: JadwalRow) {
    setError(null);
    setEditing(row);
    setMapelId(row.mapel ? String(row.mapel.id) : "");
    setGuruId(row.guru ? String(row.guru.id) : "");
    setKelasId(row.kelas ? String(row.kelas.id) : "");
    setHari(row.hari ?? "");
    setJamMulai(row.jam_mulai ?? "");
    setJamSelesai(row.jam_selesai ?? "");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("mapel_id", mapelId);
    formData.set("guru_id", guruId);
    formData.set("kelas_id", kelasId);
    formData.set("hari", hari);
    formData.set("jam_mulai", jamMulai);
    formData.set("jam_selesai", jamSelesai);

    startTransition(async () => {
      const result = editing
        ? await updateJadwal(editing.id, formData)
        : await createJadwal(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setDialogOpen(false);
        setEditing(null);
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteJadwal(deleting.id);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setDeleting(null);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-medium">Jadwal</h2>
            <p className="text-sm text-muted-foreground">{rows.length} jadwal terdaftar</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Tambah Jadwal
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Hari</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Mata Pelajaran</TableHead>
              <TableHead>Guru</TableHead>
              <TableHead>Jam Mulai</TableHead>
              <TableHead>Jam Selesai</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Belum ada jadwal
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell>{row.hari ?? "-"}</TableCell>
                  <TableCell>{row.kelas?.nama_kelas ?? "-"}</TableCell>
                  <TableCell>{row.mapel?.nama_mapel ?? "-"}</TableCell>
                  <TableCell>{row.guru?.nama ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{row.jam_mulai ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{row.jam_selesai ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil />
                        <span className="sr-only">Ubah</span>
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
            <DialogTitle>{editing ? "Ubah Jadwal" : "Tambah Jadwal"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi jadwal." : "Tambahkan jadwal baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Hari</label>
              <Select value={hari} onValueChange={(v) => setHari(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih hari" />
                </SelectTrigger>
                <SelectContent>
                  {HARI.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Mata pelajaran</label>
              <Select
                value={mapelId}
                onValueChange={(v) => setMapelId(v ?? "")}
                items={Object.fromEntries(
                  mapelOptions.map((m) => [String(m.id), m.nama_mapel])
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {mapelOptions.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nama_mapel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Guru</label>
              <Select
                value={guruId}
                onValueChange={(v) => setGuruId(v ?? "")}
                items={Object.fromEntries(
                  guruOptions.map((g) => [String(g.id), g.nama])
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih guru" />
                </SelectTrigger>
                <SelectContent>
                  {guruOptions.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Kelas</label>
              <Select
                value={kelasId}
                onValueChange={(v) => setKelasId(v ?? "")}
                items={Object.fromEntries(
                  kelasOptions.map((k) => [String(k.id), k.nama_kelas])
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {kelasOptions.map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Jam mulai"
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
              />
              <FormField
                label="Jam selesai"
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
              />
            </div>
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

      <DeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Hapus jadwal"
        description={`Yakin ingin menghapus jadwal ${deleting?.mapel?.nama_mapel ?? ""} hari ${deleting?.hari ?? "-"}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}