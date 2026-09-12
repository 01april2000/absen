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
import { createSiswa, updateSiswa, deleteSiswa } from "@/app/admin/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";

export type SiswaRow = {
  id: number;
  nis: string;
  nama: string;
  rfid_uid: string | null;
  kelas_id: number | null;
  kelas: { id: number; nama_kelas: string } | null;
};

type SiswaTableProps = {
  rows: SiswaRow[];
  kelasOptions: { id: number; nama_kelas: string }[];
};

export function SiswaTable({ rows, kelasOptions }: SiswaTableProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiswaRow | null>(null);
  const [deleting, setDeleting] = useState<SiswaRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nis, setNis] = useState("");
  const [nama, setNama] = useState("");
  const [rfidUid, setRfidUid] = useState("");
  const [kelasId, setKelasId] = useState("");

  function openCreate() {
    setError(null);
    setEditing(null);
    setNis("");
    setNama("");
    setRfidUid("");
    setKelasId("");
    setDialogOpen(true);
  }

  function openEdit(row: SiswaRow) {
    setError(null);
    setEditing(row);
    setNis(row.nis);
    setNama(row.nama);
    setRfidUid(row.rfid_uid ?? "");
    setKelasId(row.kelas_id ? String(row.kelas_id) : "");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("nis", nis.trim());
    formData.set("nama", nama.trim());
    formData.set("rfid_uid", rfidUid.trim());
    formData.set("kelas_id", kelasId);

    startTransition(async () => {
      const result = editing
        ? await updateSiswa(editing.id, formData)
        : await createSiswa(formData);
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
      const result = await deleteSiswa(deleting.id);
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
            <h2 className="font-heading font-medium">Data Siswa</h2>
            <p className="text-sm text-muted-foreground">{rows.length} siswa terdaftar</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Tambah Siswa
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>NIS</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>RFID UID</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada data siswa
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium tabular-nums">{row.nis}</TableCell>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{row.rfid_uid ?? "-"}</TableCell>
                  <TableCell>{row.kelas?.nama_kelas ?? "-"}</TableCell>
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
            <DialogTitle>{editing ? "Ubah Siswa" : "Tambah Siswa"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi siswa." : "Tambahkan siswa baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="NIS"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              placeholder="Nomor Induk Siswa"
              required
            />
            <FormField
              label="Nama lengkap"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama siswa"
              required
            />
            <FormField
              label="RFID UID"
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value)}
              placeholder="UID kartu RFID (opsional)"
            />
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
        title="Hapus siswa"
        description={`Yakin ingin menghapus siswa "${deleting?.nama}" (NIS ${deleting?.nis})? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}