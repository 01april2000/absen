"use client";

import { useState, useTransition } from "react";
import {
  Copy,
  KeyRound,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
  createDevice,
  deleteDevice,
  regenerateDeviceApiKey,
  toggleDeviceActive,
  updateDevice,
} from "@/app/admin/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { FormField } from "@/components/admin/form-field";
import { cn } from "@/lib/utils";

export type DeviceRow = {
  id: number;
  deviceId: string;
  name: string | null;
  location: string | null;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
};

type DeviceTableProps = {
  rows: DeviceRow[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function DeviceTable({ rows }: DeviceTableProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceRow | null>(null);
  const [deleting, setDeleting] = useState<DeviceRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  function openCreate() {
    setError(null);
    setEditing(null);
    setDeviceId("");
    setName("");
    setLocation("");
    setDialogOpen(true);
  }

  function openEdit(row: DeviceRow) {
    setError(null);
    setEditing(row);
    setDeviceId(row.deviceId);
    setName(row.name ?? "");
    setLocation(row.location ?? "");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("deviceId", deviceId);
    formData.set("name", name);
    formData.set("location", location);

    startTransition(async () => {
      const result = editing
        ? await updateDevice(editing.id, formData)
        : await createDevice(formData);
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
      const result = await deleteDevice(deleting.id);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setDeleting(null);
      }
    });
  }

  function handleToggleActive(row: DeviceRow) {
    startTransition(async () => {
      const result = await toggleDeviceActive(row.id, !row.isActive);
      if (result?.error) setError(result.error);
    });
  }

  function handleRegenerate(row: DeviceRow) {
    if (!confirm(`Buat API key baru untuk ${row.deviceId}?`)) return;
    startTransition(async () => {
      const result = await regenerateDeviceApiKey(row.id);
      if (result?.error) setError(result.error);
    });
  }

  function handleCopy(row: DeviceRow) {
    navigator.clipboard?.writeText(row.apiKey).then(() => {
      setCopiedKey(row.id);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-medium">Device Absensi</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} device terdaftar
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            Tambah Device
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="w-36 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Belum ada device
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.deviceId}</TableCell>
                  <TableCell>{row.name ?? "-"}</TableCell>
                  <TableCell>{row.location ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {row.apiKey.slice(0, 12)}...
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleCopy(row)}
                        title="Salin API key"
                      >
                        {copiedKey === row.id ? <RefreshCw /> : <Copy />}
                        <span className="sr-only">Salin API key</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRegenerate(row)}
                        title="Buat API key baru"
                      >
                        <KeyRound />
                        <span className="sr-only">Buat API key baru</span>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        row.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {row.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(row)}
                        title="Ubah"
                      >
                        <Pencil />
                        <span className="sr-only">Ubah</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleActive(row)}
                        title={row.isActive ? "Nonaktifkan" : "Aktifkan"}
                      >
                        <Power className={row.isActive ? "text-amber-500" : "text-emerald-500"} />
                        <span className="sr-only">Aktifkan/Nonaktifkan</span>
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
            <DialogTitle>{editing ? "Ubah Device" : "Tambah Device"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi device. API key tidak diubah di sini."
                : "Tambahkan device absensi baru. API key dibuat otomatis."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Device ID"
              placeholder="Contoh: ABSEN-01"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            />
            <FormField
              label="Nama device"
              placeholder="Contoh: Device Kelas X RPL 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FormField
              label="Lokasi"
              placeholder="Contoh: Ruang X RPL 1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
        title="Hapus device"
        description={`Yakin ingin menghapus device ${deleting?.deviceId ?? ""}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        pending={isPending}
      />
    </>
  );
}