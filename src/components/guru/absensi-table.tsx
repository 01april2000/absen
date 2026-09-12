"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

const STATUS = ["Hadir", "Terlambat", "Alpha"] as const;

const HARI_INDEX = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export type AbsensiRow = {
  id: number;
  tanggal: Date | null;
  jam: string | null;
  status: string | null;
  siswa: { id: number; nama: string; nis: string } | null;
  mapel: { id: number; nama_mapel: string } | null;
  jadwal: {
    id: number;
    jam_mulai: string | null;
    kelas: { id: number; nama_kelas: string } | null;
  } | null;
};

type JadwalOption = {
  id: number;
  hari: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  mapel: { id: number; nama_mapel: string } | null;
  kelas: { id: number; nama_kelas: string } | null;
};

type AbsensiTableProps = {
  rows: AbsensiRow[];
  mapelOptions: { id: number; nama_mapel: string }[];
  kelasOptions: { id: number; nama_kelas: string }[];
  jadwal: JadwalOption[];
  siswaByKelas: Map<number, { id: number; nama: string; nis: string }[]>;
};

const formatDate = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const dateKey = (date: Date | null) => {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toExportRows = (rows: AbsensiRow[]) =>
  rows.map((row, index) => ({
    No: index + 1,
    Tanggal: formatDate(row.tanggal),
    NIS: row.siswa?.nis ?? "-",
    "Nama Siswa": row.siswa?.nama ?? "-",
    Kelas: row.jadwal?.kelas?.nama_kelas ?? "-",
    "Mata Pelajaran": row.mapel?.nama_mapel ?? "-",
    Jam: row.jam ?? "-",
    Status: row.status ?? "-",
  }));

export function AbsensiTable({
  rows,
  mapelOptions,
  kelasOptions,
  jadwal,
  siswaByKelas,
}: AbsensiTableProps) {
  const [tanggal, setTanggal] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (tanggal && dateKey(row.tanggal) !== tanggal) return false;
      if (mapelId && String(row.mapel?.id ?? "") !== mapelId) return false;
      if (kelasId && String(row.jadwal?.kelas?.id ?? "") !== kelasId) return false;
      if (status && row.status !== status) return false;
      return true;
    });
  }, [rows, tanggal, mapelId, kelasId, status]);

  const alphaRows = useMemo(() => {
    if (!tanggal) return [] as AbsensiRow[];
    const date = new Date(`${tanggal}T00:00:00`);
    const hari = HARI_INDEX[date.getDay()];

    const matchedJadwal = jadwal.filter(
      (j) =>
        j.hari === hari &&
        (!mapelId || String(j.mapel?.id ?? "") === mapelId) &&
        (!kelasId || String(j.kelas?.id ?? "") === kelasId)
    );
    if (matchedJadwal.length === 0) return [];

    const existing = new Set(
      rows
        .filter((r) => r.jadwal && dateKey(r.tanggal) === tanggal)
        .map((r) => `${r.jadwal!.id}:${r.siswa?.id ?? "?"}`)
    );

    const alphas: AbsensiRow[] = [];
    for (const j of matchedJadwal) {
      if (!j.kelas) continue;
      const students = siswaByKelas.get(j.kelas.id) ?? [];
      for (const s of students) {
        if (existing.has(`${j.id}:${s.id}`)) continue;
        alphas.push({
          id: -alphas.length - 1,
          tanggal: date,
          jam: j.jam_mulai ?? null,
          status: "Alpha",
          siswa: s,
          mapel: j.mapel,
          jadwal: { id: j.id, jam_mulai: j.jam_mulai, kelas: j.kelas },
        });
      }
    }
    return alphas;
  }, [rows, tanggal, mapelId, kelasId, jadwal, siswaByKelas]);

  const visibleAlpha = useMemo(
    () => (status && status !== "Alpha" ? [] : alphaRows),
    [alphaRows, status]
  );

  const displayRows = useMemo(() => [...filtered, ...visibleAlpha], [filtered, visibleAlpha]);

  const handleExportExcel = () => {
    if (displayRows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(toExportRows(displayRows));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi");
    XLSX.writeFile(wb, "laporan-absensi.xlsx");
  };

  const handleExportPdf = () => {
    if (displayRows.length === 0) return;
    const doc = new jsPDF();
    autoTable(doc, {
      head: [Object.keys(toExportRows(displayRows)[0])],
      body: toExportRows(displayRows).map((r) => Object.values(r)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [23, 23, 23] },
    });
    doc.save("laporan-absensi.pdf");
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-medium">Laporan Absensi</h2>
          <p className="text-sm text-muted-foreground">
            {displayRows.length} data ditampilkan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={displayRows.length === 0}
          >
            <FileSpreadsheet />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={displayRows.length === 0}
          >
            <FileText />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Tanggal</label>
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Mata pelajaran</label>
          <Select
            value={mapelId}
            onValueChange={(v) => setMapelId(v ?? "")}
            itemToStringLabel={(value) =>
              mapelOptions.find((m) => String(m.id) === value)?.nama_mapel ?? value
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua mapel" />
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
          <label className="text-sm font-medium">Kelas</label>
          <Select
            value={kelasId}
            onValueChange={(v) => setKelasId(v ?? "")}
            itemToStringLabel={(value) =>
              kelasOptions.find((k) => String(k.id) === value)?.nama_kelas ?? value
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua kelas" />
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
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>NIS</TableHead>
            <TableHead>Nama Siswa</TableHead>
            <TableHead>Kelas</TableHead>
            <TableHead>Mata Pelajaran</TableHead>
            <TableHead>Jam</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                Tidak ada data absensi
              </TableCell>
            </TableRow>
          ) : (
            displayRows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums">{index + 1}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatDate(row.tanggal)}
                </TableCell>
                <TableCell className="tabular-nums">{row.siswa?.nis ?? "-"}</TableCell>
                <TableCell>{row.siswa?.nama ?? "-"}</TableCell>
                <TableCell>{row.jadwal?.kelas?.nama_kelas ?? "-"}</TableCell>
                <TableCell>{row.mapel?.nama_mapel ?? "-"}</TableCell>
                <TableCell className="tabular-nums">{row.jam ?? "-"}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      row.status === "Hadir" &&
                        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      row.status === "Terlambat" &&
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      row.status === "Alpha" &&
                        "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {row.status ?? "-"}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}