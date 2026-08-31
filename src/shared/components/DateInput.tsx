"use client";

import { CalendarDays, Check, Clock } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type DateInputMode = "date" | "datetime-local" | "month";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  type?: DateInputMode;
  className?: string;
  id?: string;
  name?: string;
  title?: string;
  "aria-label"?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const validDate = (year: number, month: number, day: number) => {
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day;
};

function datePart(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || !validDate(Number(match[1]), Number(match[2]), Number(match[3]))) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function timePart(value: string) {
  const match = value.match(/[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  return match ? `${match[1]}:${match[2]}${match[3] ? `:${match[3]}` : ""}` : "00:00";
}

function displayValue(value: string, type: DateInputMode) {
  if (!value) return "";
  if (type === "month") {
    const match = value.match(/^(\d{4})-(\d{2})$/);
    return match ? `${match[2]}/${match[1]}` : value;
  }
  const date = datePart(value);
  if (!date) return value;
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}${type === "datetime-local" ? ` ${timePart(value)}` : ""}`;
}

function parseTypedValue(value: string, type: DateInputMode) {
  const raw = value.trim();
  if (!raw) return "";
  if (type === "month") {
    const match = raw.match(/^(?:(\d{2})\/(\d{4})|(\d{4})-(\d{2}))$/);
    if (!match) return null;
    const year = match[2] || match[3];
    const month = match[1] || match[4];
    return Number(month) >= 1 && Number(month) <= 12 ? `${year}-${month}` : null;
  }
  const match = raw.match(/^(?:(\d{2})\/(\d{2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2}))(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const year = Number(match[3] || match[4]);
  const month = Number(match[2] || match[5]);
  const day = Number(match[1] || match[6]);
  if (!validDate(year, month, day)) return null;
  const date = `${year}-${pad(month)}-${pad(day)}`;
  if (type === "date") return date;
  const hours = Number(match[7] || 0);
  const minutes = Number(match[8] || 0);
  const seconds = Number(match[9] || 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${date}T${pad(hours)}:${pad(minutes)}${match[9] ? `:${pad(seconds)}` : ""}`;
}

function weekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - start.getTime()) / 86_400_000) + 1) / 7);
}

export function DateInput({ value, onChange, type = "date", className = "", id, name, title, disabled, required, min, max, placeholder, "aria-label": ariaLabel }: DateInputProps) {
  const generatedId = useId();
  const inputId = id || `date-input-${generatedId.replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [text, setText] = useState(() => displayValue(value, type));
  const initialDate = datePart(value);
  const [month, setMonth] = useState(() => initialDate ? new Date(`${initialDate}T00:00:00`) : new Date());
  const [draftDate, setDraftDate] = useState(() => initialDate ? new Date(`${initialDate}T00:00:00`) : new Date());
  const [draftTime, setDraftTime] = useState(() => timePart(value).slice(0, 5));

  useEffect(() => {
    setText(displayValue(value, type));
    setInvalid(false);
  }, [type, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const dates = Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + index));
    return Array.from({ length: 6 }, (_, index) => dates.slice(index * 7, index * 7 + 7));
  }, [month]);

  const openPicker = () => {
    if (disabled) return;
    const selected = datePart(value);
    const next = selected ? new Date(`${selected}T00:00:00`) : new Date();
    setMonth(next);
    setDraftDate(next);
    setDraftTime(timePart(value).slice(0, 5));
    setOpen((current) => {
      if (!current) {
        const bounds = rootRef.current?.getBoundingClientRect();
        if (bounds) setOpenAbove(window.innerHeight - bounds.bottom < 370 && bounds.top > window.innerHeight - bounds.bottom);
      }
      return !current;
    });
  };
  const commitTyped = () => {
    const parsed = parseTypedValue(text, type);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(parsed);
    setText(displayValue(parsed, type));
  };
  const selectDate = (date: Date) => {
    const selected = isoDate(date);
    if ((min && selected < min.slice(0, 10)) || (max && selected > max.slice(0, 10))) return;
    setDraftDate(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    if (type === "date") {
      onChange(selected);
      setOpen(false);
    }
  };
  const applyDateTime = () => {
    onChange(`${isoDate(draftDate)}T${draftTime || "00:00"}`);
    setOpen(false);
  };
  const selectMonth = (monthIndex: number) => {
    const selected = `${month.getFullYear()}-${pad(monthIndex + 1)}`;
    if ((min && selected < min.slice(0, 7)) || (max && selected > max.slice(0, 7))) return;
    onChange(selected);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        id={inputId}
        name={name}
        title={title}
        aria-label={ariaLabel || title}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${inputId}-error` : undefined}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        required={required}
        value={text}
        placeholder={placeholder || (type === "month" ? "MM/YYYY" : type === "datetime-local" ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY")}
        onChange={(event) => { setText(event.target.value); setInvalid(false); }}
        onClick={() => { if (!open) openPicker(); }}
        onBlur={(event) => {
          if (rootRef.current?.contains(event.relatedTarget as Node)) return;
          commitTyped();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter") { event.preventDefault(); commitTyped(); setOpen(false); }
        }}
        className={`${className} pr-11 ${invalid ? "!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20" : ""}`}
      />
      <button type="button" disabled={disabled} tabIndex={-1} onClick={openPicker} aria-label={title ? `Select ${title}` : "Select date"} aria-expanded={open} aria-controls={`${inputId}-calendar`} className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-emerald-300">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </button>
      {invalid ? <span id={`${inputId}-error`} role="alert" className="absolute left-0 top-full z-10 mt-1 text-xs font-medium text-rose-600">Use {type === "month" ? "MM/YYYY" : type === "datetime-local" ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY"}</span> : null}
      {open ? (
        <div id={`${inputId}-calendar`} role="dialog" aria-label={title || "Date picker"} className={`absolute right-0 z-[280] w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-950 ${openAbove ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"}`}>
          <div className="flex h-10 items-center justify-between border-b border-slate-200 px-2 dark:border-slate-800">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + (type === "month" ? -12 : -1), 1))} className="rounded-lg p-1.5 text-2xl font-semibold leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={type === "month" ? "Previous year" : "Previous month"}>‹</button>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{month.toLocaleDateString("en-US", type === "month" ? { year: "numeric" } : { month: "long", year: "numeric" })}</p>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + (type === "month" ? 12 : 1), 1))} className="rounded-lg p-1.5 text-2xl font-semibold leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={type === "month" ? "Next year" : "Next month"}>›</button>
          </div>
          {type === "month" ? (
            <div className="grid grid-cols-3 gap-1 p-2">{Array.from({ length: 12 }, (_, index) => { const selected = value === `${month.getFullYear()}-${pad(index + 1)}`; return <button key={index} type="button" onClick={() => selectMonth(index)} className={`rounded-lg px-2 py-3 text-sm font-semibold transition ${selected ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"}`}>{new Date(2020, index, 1).toLocaleDateString("en-US", { month: "short" })}</button>; })}</div>
          ) : (
            <>
              <div className="grid h-8 grid-cols-8 items-center border-b border-slate-200 text-center text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300"><span>#</span>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
              <div>{weeks.map((week, weekIndex) => <div key={weekIndex} className="grid h-9 grid-cols-8 border-b border-slate-200 last:border-b-0 dark:border-slate-800"><span className="flex items-center justify-center text-xs font-semibold text-slate-400">{weekNumber(week[0])}</span>{week.map((date) => { const currentMonth = date.getMonth() === month.getMonth(); const selected = isoDate(draftDate) === isoDate(date); const today = isoDate(new Date()) === isoDate(date); const unavailable = Boolean((min && isoDate(date) < min.slice(0, 10)) || (max && isoDate(date) > max.slice(0, 10))); return <button key={date.toISOString()} type="button" disabled={unavailable} onClick={() => selectDate(date)} className={`m-0.5 flex items-center justify-center rounded-full text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${selected ? "bg-emerald-600 text-white" : currentMonth ? `text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 ${today ? "ring-1 ring-emerald-500" : ""}` : "text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800"}`}>{date.getDate()}</button>; })}</div>)}</div>
              {type === "datetime-local" ? <div className="mt-1 flex items-center gap-2 border-t border-slate-200 p-2 dark:border-slate-800"><Clock className="h-4 w-4 text-slate-400" /><input type="time" step="60" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700" /><button type="button" onClick={applyDateTime} className="flex h-9 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Apply date and time"><Check className="h-4 w-4" /></button></div> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
