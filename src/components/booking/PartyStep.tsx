"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { isBookable, type Slot } from "@/domain/booking/availability";
import type { BookingSettings } from "@/domain/booking/settings";
import { formatClock } from "@/domain/hours";
import type { OutletSlug } from "@/domain/outlet";
import type { BookingService } from "@/services/bookings";

const t = copy.booking.party;

interface PartyStepProps {
  readonly service: BookingService;
  readonly settings: BookingSettings;
  readonly outlet: OutletSlug;
  readonly date: string;
  readonly time: string;
  readonly partySize: number;
  readonly onChange: (partySize: number) => void;
  readonly onPickTime: () => void;
  /** False while the chosen slot cannot take this party. */
  readonly onFitChange: (fits: boolean) => void;
}

export function PartyStep({
  service,
  settings,
  outlet,
  date,
  time,
  partySize,
  onChange,
  onPickTime,
  onFitChange,
}: PartyStepProps) {
  const instant = partySize <= settings.instantMaxPartySize;
  const key = `${outlet}|${date}|${time}|${partySize}`;
  const [slot, setSlot] = useState<{ key: string; slot: Slot | undefined } | null>(null);

  useEffect(() => {
    let live = true;
    service.getAvailability({ outlet, date, partySize }).then((result) => {
      if (live) setSlot({ key, slot: result.ok ? result.value.slots.find((s) => s.time === time) : undefined });
    });
    return () => {
      live = false;
    };
  }, [service, outlet, date, time, partySize, key]);

  const checked = slot?.key === key ? slot.slot : null;
  const fits = !instant || (checked !== null && checked !== undefined && isBookable(checked));
  const knownNoRoom = instant && slot?.key === key && !fits;

  useEffect(() => {
    onFitChange(slot?.key === key && fits);
  }, [slot, key, fits, onFitChange]);

  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label={t.label}
        className="flex items-center justify-between gap-4 rounded-sm border border-line bg-surface-raised p-4 tablet:justify-center tablet:gap-12"
      >
        <button
          type="button"
          onClick={() => onChange(partySize - 1)}
          disabled={partySize <= 1}
          className="inline-flex size-14 items-center justify-center rounded-full border-2 border-accent text-accent disabled:border-line disabled:text-fg-muted"
        >
          <Icon name="minus" label={t.fewer} />
        </button>
        <output
          aria-live="polite"
          className="min-w-[3ch] text-center text-display leading-none font-semibold tabular-nums"
        >
          {partySize}
        </output>
        <button
          type="button"
          onClick={() => onChange(partySize + 1)}
          disabled={partySize >= settings.maxPartySize}
          className="inline-flex size-14 items-center justify-center rounded-full border-2 border-accent text-accent disabled:border-line disabled:text-fg-muted"
        >
          <Icon name="plus" label={t.more} />
        </button>
      </div>

      {instant ? (
        <p className="flex items-center gap-2 text-success">
          <span className="size-2.5 rounded-full bg-current" aria-hidden="true" />
          <Tbc id={placeholders.instantMaxPartySize.id}>{t.instant(settings.instantMaxPartySize)}</Tbc>
        </p>
      ) : (
        <div className="flex flex-col gap-1 rounded-sm border border-line-strong p-4">
          <p className="font-semibold">{t.requestTitle(settings.instantMaxPartySize + 1)}</p>
          <p className="text-fg-muted">
            {t.requestBody} <Tbc id={placeholders.groupReplyTimeLabel.id}>{placeholders.groupReplyTimeLabel.value}</Tbc>
            .
          </p>
        </div>
      )}

      {knownNoRoom && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-sm border border-danger p-4">
          <p>{t.noRoom(formatClock(time), checked?.remaining ?? 0)}</p>
          <button
            type="button"
            onClick={onPickTime}
            className="min-h-11 font-medium text-accent underline underline-offset-4"
          >
            {t.pickTime}
          </button>
        </div>
      )}

      {partySize >= settings.maxPartySize && (
        <div className="flex flex-col items-start gap-1 rounded-sm border border-line p-4">
          <p className="font-semibold">
            <Tbc id={placeholders.maxPartySize.id}>{t.tooBigTitle(settings.maxPartySize)}</Tbc>
          </p>
          <p className="text-fg-muted">{t.tooBigBody}</p>
          <Link
            href={routes.enquire}
            className="inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4"
          >
            {t.enquire}
          </Link>
        </div>
      )}
    </div>
  );
}
