"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib";

function getCurrentYear() {
  return new Date().getFullYear();
}

interface Holiday {
  _id: string;
  name: string;
  date: string;
  year: number;
}

export default function PaidHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState(getCurrentYear());
  const [showDialog, setShowDialog] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState({ name: "", date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line
  }, [year]);

  async function fetchHolidays() {
    setLoading(true);
    setError("");
    try {
      // Get the access token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      // Use relative path that works in both development and production environments
      const res = await fetch(`/api/v1/paid-holidays?year=${year}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch holidays: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setHolidays(data);
    } catch (err: any) {
      console.error('Holiday fetch error:', err);
      setError(err?.message || "Error loading holidays");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditHoliday(null);
    setForm({ name: "", date: "" });
    setShowDialog(true);
  }

  function openEdit(holiday: Holiday) {
    setEditHoliday(holiday);
    setForm({ name: holiday.name, date: holiday.date.slice(0, 10) });
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditHoliday(null);
    setForm({ name: "", date: "" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editHoliday ? "PATCH" : "POST";
      // Use relative paths that work in both development and production environments
      const url = editHoliday ? `/api/v1/paid-holidays/${editHoliday._id}` : "/api/v1/paid-holidays";

      // Get the access token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      const res = await fetch(url, {
        method,
        headers: token ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...form, year }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save holiday: ${res.status} ${res.statusText}`);
      }

      toast({ title: editHoliday ? "Holiday updated" : "Holiday added" });
      closeDialog();
      fetchHolidays();
    } catch (err: any) {
      console.error('Holiday save error:', err);
      toast({ title: "Error", description: err?.message || "An error occurred", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this holiday?")) return;
    setSaving(true);
    try {
      // Get the access token from localStorage
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      // Use relative path that works in both development and production environments
      const res = await fetch(`/api/v1/paid-holidays/${id}`, {
        method: "DELETE",
        headers: token ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete holiday: ${res.status} ${res.statusText}`);
      }

      toast({ title: "Holiday deleted" });
      fetchHolidays();
    } catch (err: any) {
      console.error('Holiday delete error:', err);
      toast({ title: "Error", description: err?.message || "An error occurred", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Paid Holidays</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => getCurrentYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button onClick={openAdd}>Add Holiday</Button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">{error}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No holidays found.</TableCell>
              </TableRow>
            ) : holidays.map((h: Holiday) => (
              <TableRow key={h._id}>
                <TableCell>{new Date(h.date).toLocaleDateString()}</TableCell>
                <TableCell>{h.name}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => openEdit(h)}>Edit</Button>{" "}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(h._id)} disabled={saving}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogTitle>{editHoliday ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block mb-1 font-medium">Date</label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <Input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}