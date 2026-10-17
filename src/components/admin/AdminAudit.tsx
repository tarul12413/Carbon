"use client";

import { adminCopy, staffCopy } from "@/content/admin-copy";
import { staffById } from "@/domain/staff";
import { clientServices } from "@/services/client";
import { useAdmin } from "./AdminShell";
import { LoadState, PageTitle, dayAndTime, useLoad } from "./parts";

const t = adminCopy.audit;

/** Blueprint section 10, Users and audit log: who changed what, and when. */
export function AdminAudit() {
  const { actor, staff, scope, outletName } = useAdmin();
  const { result, reload } = useLoad(() => clientServices.admin.audit(actor, scope), `${actor.staffId}|${scope}`);
  const who = (id: string) => {
    const member = staffById(id);
    if (!member) return id;
    const where = member.outlets.length > 1 ? adminCopy.allOutlets : outletName(member.outlets[0] ?? "c-scheme");
    return adminCopy.accountLabel(staffCopy.roles[member.role], where);
  };
  return (
    <div className="flex flex-col gap-6">
      <PageTitle lead={staff.role === "owner" ? `${t.lead} ${t.ownerOnly}` : t.lead}>{t.title}</PageTitle>
      <LoadState result={result} reload={reload}>
        {(entries) =>
          entries.length === 0 ? (
            <p className="text-fg-muted">{t.none}</p>
          ) : (
            <ol className="flex flex-col divide-y divide-line border-y border-line">
              {entries.map((e, i) => (
                <li key={`${e.at}-${i}`} className="grid gap-1 py-3 tablet:grid-cols-[9rem_1fr]">
                  <span className="font-mono text-small text-fg-muted">{dayAndTime(e.at)}</span>
                  <span className="flex flex-col gap-0.5">
                    <span>
                      <span className="font-medium">{t.actions[e.action]}</span>
                      {": "}
                      <span className="font-mono">{e.entity}</span>
                      {e.outlet && <span className="text-fg-muted"> · {outletName(e.outlet)}</span>}
                    </span>
                    {e.detail && <span className="text-small">{e.detail}</span>}
                    <span className="text-small text-fg-muted">{who(e.staffId)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )
        }
      </LoadState>
    </div>
  );
}
