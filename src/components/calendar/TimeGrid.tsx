"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppointmentWithDetails } from "@/lib/types";
import {
  formatTimeLabel,
  minutesToTime,
  nowMinutesInSalon,
  todayInSalon,
  toSalonWallClock,
} from "@/lib/utils/timezone";
import { appointmentStatusConfig } from "@/lib/utils/status";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { Globe } from "lucide-react";

export interface GridColumn {
  key: string;
  label: string;
  sublabel?: string;
  /** yyyy-MM-dd this column represents */
  dateKey: string;
  /** Staff member this column represents, or null when the column is a day */
  staffId: string | null;
  /** Minutes the salon/staff are unavailable, drawn as shaded blocks */
  closedRanges?: { start: number; end: number }[];
}

export interface MoveTarget {
  appointment: AppointmentWithDetails;
  dateKey: string;
  staffId: string;
  startMinutes: number;
}

const SNAP_MINUTES = 15;
const MIN_CARD_HEIGHT = 26;

interface Props {
  columns: GridColumn[];
  appointments: AppointmentWithDetails[];
  /** Which column an appointment belongs to */
  columnKeyOf: (appointment: AppointmentWithDetails) => string;
  startMinutes: number;
  endMinutes: number;
  hourHeight?: number;
  columnMinWidth?: number;
  onSelect: (appointment: AppointmentWithDetails) => void;
  onCreate: (slot: { dateKey: string; staffId: string | null; time: string }) => void;
  onMove: (target: MoveTarget) => void;
}

interface DragState {
  appointment: AppointmentWithDetails;
  pointerId: number;
  originX: number;
  originY: number;
  grabOffsetMinutes: number;
  moved: boolean;
  columnKey: string;
  startMinutes: number;
}

export function TimeGrid({
  columns,
  appointments,
  columnKeyOf,
  startMinutes,
  endMinutes,
  hourHeight = 68,
  columnMinWidth = 168,
  onSelect,
  onCreate,
  onMove,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  const isDragging = drag !== null;

  function setDrag(next: DragState | null) {
    dragRef.current = next;
    setDragState(next);
  }

  const today = todayInSalon();

  useEffect(() => {
    const tick = () => setNowMinutes(nowMinutesInSalon());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  const totalMinutes = Math.max(endMinutes - startMinutes, 60);
  const pxPerMinute = hourHeight / 60;
  const gridHeight = totalMinutes * pxPerMinute;

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    for (let m = Math.ceil(startMinutes / 60) * 60; m <= endMinutes; m += 60) marks.push(m);
    return marks;
  }, [startMinutes, endMinutes]);

  /** Lay appointments out per column, splitting overlaps into side-by-side lanes. */
  const laidOut = useMemo(() => {
    const byColumn = new Map<string, { appointment: AppointmentWithDetails; lane: number; lanes: number }[]>();

    for (const column of columns) byColumn.set(column.key, []);

    for (const column of columns) {
      const columnAppointments = appointments
        .filter((a) => columnKeyOf(a) === column.key)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Greedy lane packing over each cluster of overlapping appointments.
      let cluster: AppointmentWithDetails[] = [];
      let clusterEnd = -Infinity;

      const flush = () => {
        if (cluster.length === 0) return;
        const laneEnds: number[] = [];
        const placed = cluster.map((appointment) => {
          const start = new Date(appointment.start_time).getTime();
          const end = new Date(appointment.end_time).getTime();
          let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
          if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(end);
          } else {
            laneEnds[lane] = end;
          }
          return { appointment, lane };
        });
        const list = byColumn.get(column.key)!;
        placed.forEach(({ appointment, lane }) =>
          list.push({ appointment, lane, lanes: laneEnds.length })
        );
        cluster = [];
        clusterEnd = -Infinity;
      };

      for (const appointment of columnAppointments) {
        const start = new Date(appointment.start_time).getTime();
        const end = new Date(appointment.end_time).getTime();
        if (start >= clusterEnd && cluster.length > 0) flush();
        cluster.push(appointment);
        clusterEnd = Math.max(clusterEnd, end);
      }
      flush();
    }

    return byColumn;
  }, [columns, appointments, columnKeyOf]);

  const minutesFromPointer = useCallback(
    (clientY: number) => {
      const body = bodyRef.current;
      if (!body) return startMinutes;
      const rect = body.getBoundingClientRect();
      const offset = clientY - rect.top + body.scrollTop;
      return startMinutes + offset / pxPerMinute;
    },
    [pxPerMinute, startMinutes]
  );

  const columnFromPointer = useCallback(
    (clientX: number): GridColumn | null => {
      for (const column of columns) {
        const element = columnRefs.current[column.key];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) return column;
      }
      return null;
    },
    [columns]
  );

  function snap(minutes: number): number {
    const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(Math.max(snapped, startMinutes), endMinutes - SNAP_MINUTES);
  }

  function handleBackgroundClick(column: GridColumn, event: React.MouseEvent<HTMLDivElement>) {
    if (drag?.moved) return;
    const minutes = snap(minutesFromPointer(event.clientY));
    onCreate({ dateKey: column.dateKey, staffId: column.staffId, time: minutesToTime(minutes) });
  }

  function handlePointerDown(appointment: AppointmentWithDetails, event: React.PointerEvent) {
    if (event.button !== 0) return;
    if (appointment.status === "cancelled") return;
    const start = toSalonWallClock(appointment.start_time).minutes;
    setDrag({
      appointment,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      grabOffsetMinutes: minutesFromPointer(event.clientY) - start,
      moved: false,
      columnKey: columnKeyOf(appointment),
      startMinutes: start,
    });
  }

  // Drag tracking lives on the window rather than on the card, because the
  // card unmounts as soon as it is dragged into a different column.
  useEffect(() => {
    if (!isDragging) return;

    function onPointerMove(event: PointerEvent) {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;

      const movedFar =
        Math.abs(event.clientX - current.originX) > 5 ||
        Math.abs(event.clientY - current.originY) > 5;
      if (!movedFar && !current.moved) return;

      const column = columnFromPointer(event.clientX);
      setDrag({
        ...current,
        moved: true,
        columnKey: column?.key ?? current.columnKey,
        startMinutes: snap(minutesFromPointer(event.clientY) - current.grabOffsetMinutes),
      });
    }

    function onPointerUp(event: PointerEvent) {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      setDrag(null);

      if (!current.moved) {
        onSelect(current.appointment);
        return;
      }

      const column = columns.find((c) => c.key === current.columnKey);
      if (!column) return;

      const originalStart = toSalonWallClock(current.appointment.start_time);
      const staffId = column.staffId ?? current.appointment.staff_id;
      const unchanged =
        column.dateKey === originalStart.date &&
        staffId === current.appointment.staff_id &&
        current.startMinutes === originalStart.minutes;
      if (unchanged) return;

      onMove({
        appointment: current.appointment,
        dateKey: column.dateKey,
        staffId,
        startMinutes: current.startMinutes,
      });
    }

    function onPointerCancel() {
      setDrag(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, columns, columnFromPointer, minutesFromPointer, onMove, onSelect]);

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <div className="flex" style={{ minWidth: 56 + columns.length * Math.min(columnMinWidth, 220) }}>
        {/* Time gutter */}
        <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-border bg-surface">
          <div className="h-12 border-b border-border" />
          <div className="relative" style={{ height: gridHeight }}>
            {hourMarks.map((minutes) => (
              <span
                key={minutes}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium text-ink-muted"
                style={{ top: (minutes - startMinutes) * pxPerMinute }}
              >
                {formatTimeLabel(minutesToTime(minutes))}
              </span>
            ))}
          </div>
        </div>

        <div ref={bodyRef} className="flex flex-1">
          {columns.map((column) => {
            const items = laidOut.get(column.key) ?? [];
            const isToday = column.dateKey === today;
            return (
              <div
                key={column.key}
                ref={(el) => {
                  columnRefs.current[column.key] = el;
                }}
                className="flex-1 border-r border-border last:border-r-0"
                style={{ minWidth: columnMinWidth }}
              >
                <div
                  className={cn(
                    "flex h-12 flex-col items-center justify-center border-b border-border px-2",
                    isToday && "bg-brand-50/60"
                  )}
                >
                  <p className="truncate text-xs font-semibold text-ink">{column.label}</p>
                  {column.sublabel && (
                    <p className="truncate text-[10px] text-ink-muted">{column.sublabel}</p>
                  )}
                </div>

                <div
                  className="relative"
                  style={{ height: gridHeight }}
                  onClick={(event) => handleBackgroundClick(column, event)}
                >
                  {/* Hour lines */}
                  {hourMarks.map((minutes) => (
                    <div
                      key={minutes}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                      style={{ top: (minutes - startMinutes) * pxPerMinute }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {hourMarks.map((minutes) => (
                    <div
                      key={`half-${minutes}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/40"
                      style={{ top: (minutes + 30 - startMinutes) * pxPerMinute }}
                    />
                  ))}

                  {/* Closed / off-shift shading */}
                  {(column.closedRanges ?? []).map((range, i) => (
                    <div
                      key={i}
                      className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(45deg,rgba(28,25,23,0.05),rgba(28,25,23,0.05)_6px,rgba(28,25,23,0.02)_6px,rgba(28,25,23,0.02)_12px)]"
                      style={{
                        top: (Math.max(range.start, startMinutes) - startMinutes) * pxPerMinute,
                        height:
                          (Math.min(range.end, endMinutes) - Math.max(range.start, startMinutes)) *
                          pxPerMinute,
                      }}
                    />
                  ))}

                  {isToday && nowMinutes !== null && nowMinutes >= startMinutes && nowMinutes <= endMinutes && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger"
                      style={{ top: (nowMinutes - startMinutes) * pxPerMinute }}
                    >
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger" />
                    </div>
                  )}

                  {/* Ghost of a card being dragged in from another column */}
                  {drag?.moved &&
                    drag.columnKey === column.key &&
                    columnKeyOf(drag.appointment) !== column.key && (
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-x-0.5 z-30 overflow-hidden rounded-lg border border-l-4 px-1.5 py-1 opacity-90 shadow-lg ring-2 ring-brand-400",
                          appointmentStatusConfig[drag.appointment.status].card
                        )}
                        style={{
                          top: (drag.startMinutes - startMinutes) * pxPerMinute,
                          height: Math.max(
                            (Math.round(
                              (new Date(drag.appointment.end_time).getTime() -
                                new Date(drag.appointment.start_time).getTime()) /
                                60_000
                            ) *
                              hourHeight) /
                              60 -
                              2,
                            MIN_CARD_HEIGHT
                          ),
                        }}
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight text-ink">
                          {drag.appointment.customer_name}
                        </p>
                        <p className="truncate text-[10px] leading-tight text-ink-muted">
                          {formatTimeLabel(minutesToTime(drag.startMinutes))}
                        </p>
                      </div>
                    )}

                  {items.map(({ appointment, lane, lanes }) => {
                    const isDragging = drag?.moved && drag.appointment.id === appointment.id;
                    const wallStart = toSalonWallClock(appointment.start_time);
                    const duration = Math.max(
                      Math.round(
                        (new Date(appointment.end_time).getTime() -
                          new Date(appointment.start_time).getTime()) /
                          60_000
                      ),
                      15
                    );
                    const effectiveStart =
                      isDragging && drag ? drag.startMinutes : wallStart.minutes;
                    const hiddenByDrag = drag?.moved && drag.appointment.id === appointment.id
                      ? drag.columnKey !== column.key
                      : false;
                    if (hiddenByDrag) return null;

                    const top = (effectiveStart - startMinutes) * pxPerMinute;
                    const height = Math.max(duration * pxPerMinute - 2, MIN_CARD_HEIGHT);
                    const status = appointmentStatusConfig[appointment.status];

                    return (
                      <div
                        key={appointment.id}
                        role="button"
                        tabIndex={0}
                        onPointerDown={(event) => handlePointerDown(appointment, event)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelect(appointment);
                          }
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className={cn(
                          "absolute z-10 select-none overflow-hidden rounded-lg border border-l-4 px-1.5 py-1 text-left shadow-subtle",
                          "touch-none cursor-grab focus:outline-none focus:ring-2 focus:ring-brand-300",
                          status.card,
                          appointment.status === "cancelled" && "opacity-50 line-through cursor-not-allowed",
                          isDragging && "z-30 cursor-grabbing opacity-90 shadow-lg ring-2 ring-brand-400"
                        )}
                        style={{
                          top,
                          height,
                          left: `${(lane / lanes) * 100}%`,
                          width: `calc(${100 / lanes}% - 4px)`,
                          marginLeft: 2,
                        }}
                      >
                        <p className="flex items-center gap-1 truncate text-[11px] font-semibold leading-tight text-ink">
                          {appointment.source === "online" && (
                            <Globe className="h-2.5 w-2.5 shrink-0 text-brand-600" aria-label="Booked online" />
                          )}
                          <span className="truncate">{appointment.customer_name}</span>
                        </p>
                        {height > 34 && (
                          <p className="truncate text-[10px] leading-tight text-ink-muted">
                            {appointment.service_name}
                          </p>
                        )}
                        {height > 52 && (
                          <p className="truncate text-[10px] leading-tight text-ink-muted">
                            {formatTimeLabel(minutesToTime(effectiveStart))} ·{" "}
                            {formatCurrency(appointment.service_price)}
                          </p>
                        )}
                        {height > 70 && column.staffId === null && (
                          <p className="truncate text-[10px] leading-tight text-ink-muted">
                            {appointment.staff_name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
