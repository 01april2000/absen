"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, X } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setTitipTugasStatus } from "@/app/admin/actions";
import { DynamicBlockNoteReadOnly } from "@/components/editor/dynamic-readonly";
import { cn } from "@/lib/utils";

export type TitipTugasRow = {
  id: number;
  konten: string;
  status: string;
  createdAt: Date;
  izin: { id: number; jenis: string; tanggal: Date; status: string };
  guru: { nama: string };
  kelas: { nama_kelas: string };
  jadwal: {
    hari: string | null;
    jam_mulai: string | null;
    jam_selesai: string | null;
    mapel: { nama_mapel: string } | null;
  };
};

type TitipTugasTableProps = {
  rows: TitipTugasRow[];
};

const statusBadge = (status: string) =>
  cn(
    "rounded-full px-2 py-0.5 text-xs font-medium",
    status === "Menunggu" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    status === "Disetujui" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    status === "Ditolak" && "bg-rose-500/10 text-rose-700 dark:text-rose-400"
  );

export function TitipTugasTable({ rows }: TitipTugasTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewing, setViewing] = useState<TitipTugasRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setStatus(row: TitipTugasRow, status: "Disetujui" | "Ditolak") {
    setError(null);
    startTransition(async () => {
      const result = await setTitipTugasStatus(row.id, status);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div>
          <h2 className="font-heading font-medium">Titip Tugas</h2>
          <p className="text-sm text-muted-foreground">{rows.length} titip tugas masuk</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Guru</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Mata Pelajaran</TableHead>
              <TableHead>Tanggal Izin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Belum ada titip tugas
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.guru.nama}</TableCell>
                  <TableCell>{row.kelas.nama_kelas}</TableCell>
                  <TableCell>{row.jadwal.mapel?.nama_mapel ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.izin.jenis} • {formatDate(row.izin.tanggal)}
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
                        title="Lihat Isi Tugas"
                        onClick={() => setViewing(row)}
                      >
                        <Eye />
                        <span className="sr-only">Lihat</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-emerald-600"
                        title="Setujui"
                        disabled={isPending || row.status === "Disetujui"}
                        onClick={() => setStatus(row, "Disetujui")}
                      >
                        <Check />
                        <span className="sr-only">Setujui</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        title="Tolak"
                        disabled={isPending || row.status === "Ditolak"}
                        onClick={() => setStatus(row, "Ditolak")}
                      >
                        <X />
                        <span className="sr-only">Tolak</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Isi Titip Tugas</DialogTitle>
            <DialogDescription>
              {viewing
                ? `${viewing.guru.nama} • ${viewing.kelas.nama_kelas} • ${
                    viewing.jadwal.mapel?.nama_mapel ?? "-"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewing && <DynamicBlockNoteReadOnly initialContent={viewing.konten} />}
        </DialogContent>
      </Dialog>
    </>
  );
}