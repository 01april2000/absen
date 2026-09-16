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
import { createGuru, updateGuru, deleteGuru } from "@/app/admin/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";

export type GuruRow = {
  id: number;
  nama: string;
  username: string | null;
  mapel: { id: number; nama_mapel: string }[];
};

const EMAIL_DOMAIN = "sekolah.ac.id";

function toLoginEmail(username: string | null): string {
  if (!username) return "";
  return username.includes("@") ? username : `${username}@${EMAIL_DOMAIN}`;
}

function toUsername(email: string): string {
  return email.includes("@") ? email.split("@")[0].trim() : email.trim();
}

type GuruTableProps = {
  rows: GuruRow[];
  mapelOptions: { id: number; nama_mapel: string; kode_mapel: string }[];
};

export function GuruTable({ rows, mapelOptions }: GuruTableProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GuruRow | null>(null);
  const [deleting, setDeleting] = useState<GuruRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mapelIds, setMapelIds] = useState<Set<number>>(new Set());

  function toggleMapel(id: number) {
    setMapelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openCreate() {
    setError(null);
    setEditing(null);
    setNama("");
    setUsername("");
    setPassword("");
    setMapelIds(new Set());
    setDialogOpen(true);
  }

  function openEdit(row: GuruRow) {
    setError(null);
    setEditing(row);
    setNama(row.nama);
    setUsername(toLoginEmail(row.username));
    setPassword("");
    setMapelIds(new Set(row.mapel.map((m) => m.id)));
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("nama", nama.trim());
    formData.set("username", toUsername(username));
    if (password) {
      formData.set("password", password);
    }
    for (const id of mapelIds) {
      formData.append("mapel_ids", String(id));
    }

    startTransition(async () => {
      const result = editing
        ? await updateGuru(editing.id, formData)
        : await createGuru(formData);
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
      const result = await deleteGuru(deleting.id);
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
            <h2 className="font-heading font-medium">Data Guru</h2>
            <p className="text-sm text-muted-foreground">{rows.length} guru terdaftar</p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Tambah Guru
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Mata Pelajaran</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Belum ada data guru
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.nama}</TableCell>
                  <TableCell>{row.username ? toLoginEmail(row.username) : "-"}</TableCell>
                  <TableCell>
                    {row.mapel.length === 0
                      ? "-"
                      : row.mapel.map((m) => m.nama_mapel).join(", ")}
                  </TableCell>
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
            <DialogTitle>{editing ? "Ubah Guru" : "Tambah Guru"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi guru." : "Tambahkan guru baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Nama lengkap"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama guru"
              required
            />
            <FormField
              label="Username (email login)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={`username@${EMAIL_DOMAIN}`}
            />
            <FormField
              label={editing ? "Password (opsional)" : "Password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? "Kosongkan jika tidak ingin mengubah" : "Password untuk login"}
              required={!editing}
            />
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Mata pelajaran</label>
              <div className="grid gap-1.5 rounded-md border p-2">
                {mapelOptions.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">
                    Belum ada mata pelajaran
                  </p>
                ) : (
                  mapelOptions.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={mapelIds.has(m.id)}
                        onChange={() => toggleMapel(m.id)}
                      />
                      {m.nama_mapel}
                    </label>
                  ))
                )}
              </div>
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
        title="Hapus guru"
        description={`Yakin ingin menghapus guru "${deleting?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}