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
import { createKelas, updateKelas, deleteKelas } from "@/app/admin/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";

export type KelasRow = {
  id: number;
  nama_kelas: string;
  _count: { siswa: number; jadwal: number };
};

type KelasTableProps = {
  rows: KelasRow[];
};

export function KelasTable({ rows }: KelasTableProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KelasRow | null>(null);
  const [deleting, setDeleting] = useState<KelasRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [namaKelas, setNamaKelas] = useState("");

  function openCreate() {
    setError(null);
    setEditing(null);
    setNamaKelas("");
    setDialogOpen(true);
  }

  function openEdit(row: KelasRow) {
    setError(null);
    setEditing(row);
    setNamaKelas(row.nama_kelas);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("nama_kelas", namaKelas.trim());

    startTransition(async () => {
      const result = editing
        ? await updateKelas(editing.id, formData)
        : await createKelas(formData);
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
      const result = await deleteKelas(deleting.id);
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
            <h2 className="font-heading font-medium">Kelas</h2>
            <p className="text-sm text-muted-foreground">{rows.length} kelas terdaftar</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Tambah Kelas
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama Kelas</TableHead>
              <TableHead>Jumlah Siswa</TableHead>
              <TableHead>Jumlah Jadwal</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Belum ada kelas
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.nama_kelas}</TableCell>
                  <TableCell>{row._count.siswa}</TableCell>
                  <TableCell>{row._count.jadwal}</TableCell>
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
            <DialogTitle>{editing ? "Ubah Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi kelas." : "Tambahkan kelas baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Nama kelas"
              value={namaKelas}
              onChange={(e) => setNamaKelas(e.target.value)}
              placeholder="Contoh: 7A"
              required
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

      <DeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Hapus kelas"
        description={`Yakin ingin menghapus kelas "${deleting?.nama_kelas}"? Siswa dan jadwal yang terkait akan kehilangan kelas ini.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}