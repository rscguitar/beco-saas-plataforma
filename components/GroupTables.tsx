"use client";

import type { Competitor } from "@/lib/engine/types";
import { Avatar } from "./Avatar";

/** As 8 tabelas de grupo, 4 por linha, na identidade do programa. */
export function GroupTables({
  groups, columns = 4,
}: { groups: Competitor[][]; columns?: number }) {
  return (
    <div
      className="grid flex-none gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
    >
      {groups.map((membros, gi) => (
        <div key={gi} className="flex min-w-0 flex-col gap-1.5">
          <div
            className="rounded-[9px] px-2 py-2 text-center text-[30px] font-extrabold uppercase leading-none text-white"
            style={{ background: "linear-gradient(180deg,#F5822A,#DF5C05)", boxShadow: "0 3px 0 rgba(0,0,0,.28)" }}
          >
            Grupo {String.fromCharCode(65 + gi)}
          </div>
          <div className="overflow-hidden rounded-[9px] border-2" style={{ borderColor: "rgba(63,224,78,.42)", background: "#06371A" }}>
            {Array.from({ length: 4 }, (_, i) => membros[i] ?? null).map((c, i) => (
              <div
                key={i}
                className="grid items-stretch border-b last:border-b-0"
                style={{ gridTemplateColumns: "44px 40px minmax(0,1fr)", height: 56, borderColor: "rgba(63,224,78,.22)", background: "#0A4423" }}
              >
                <span className="grid place-items-center text-[17px] font-extrabold tabular-nums" style={{ background: "#3FE04E", color: "#04280F" }}>
                  {i + 1}
                </span>
                <span className="grid place-items-center">
                  {c ? <Avatar competitor={c} size={34} /> : null}
                </span>
                <span className="flex items-center overflow-hidden truncate px-2 text-[22px] font-bold uppercase leading-none">
                  {c?.name ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
