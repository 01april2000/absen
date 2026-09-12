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
import { createMapel, updateMapel, deleteMapel } from "@/app/admin/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";

export type MapelRow = {
  id: number;
  nama_mapel: string;
  kode_mapel: string;
  _count: { guru: number };
};

type MapelTableProps = {
  rows: MapelRow[];
};

export function MapelTable({ rows }: MapelTableProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MapelRow | null>(null);
  const [deleting, setDeleting] = useState<MapelRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [namaMapel, setNamaMapel] = useState("");
  const [kodeMapel, setKodeMapel] = useState("");

  function openCreate() {
    setError(null);
    setEditing(null);
    setNamaMapel("");
    setKodeMapel("");
    setDialogOpen(true);
  }

  function openEdit(row: MapelRow) {
    setError(null);
    setEditing(row);
    setNamaMapel(row.nama_mapel);
    setKodeMapel(row.kode_mapel);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("nama_mapel", namaMapel.trim());
    formData.set("kode_mapel", kodeMapel.trim().toUpperCase());

    startTransition(async () => {
      const result = editing
        ? await updateMapel(editing.id, formData)
        : await createMapel(formData);
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
      const result = await deleteMapel(deleting.id);
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
            <h2 className="font-heading font-medium">Mata Pelajaran</h2>
            <p className="text-sm text-muted-foreground">{rows.length} mata pelajaran terdaftar</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Tambah Mapel
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Mata Pelajaran</TableHead>
              <TableHead>Jumlah Guru</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Belum ada mata pelajaran
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.kode_mapel}</TableCell>
                  <TableCell>{row.nama_mapel}</TableCell>
                  <TableCell>{row._count.guru}</TableCell>
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
            <DialogTitle>{editing ? "Ubah Mata Pelajaran" : "Tambah Mata Pelajaran"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi mata pelajaran." : "Tambahkan mata pelajaran baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Nama mata pelajaran"
              value={namaMapel}
              onChange={(e) => setNamaMapel(e.target.value)}
              placeholder="Contoh: Matematika"
              required
            />
            <FormField
              label="Kode mata pelajaran"
              value={kodeMapel}
              onChange={(e) => setKodeMapel(e.target.value)}
              placeholder="Contoh: MTK"
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
        title="Hapus mata pelajaran"
        description={`Yakin ingin menghapus mata pelajaran "${deleting?.nama_mapel}"? Guru yang terkait akan kehilangan mapel ini.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}