import React, { useState } from "react";
import { C, F } from "./theme.js";
import { HeaderRow } from "./ui.jsx";
import { RequestsScreen, RequestsInbox, EmptyRoster } from "./chatmatch.jsx";
import { DiscoverPane } from "./discover.jsx";

/* ————————————————— MENTEES —————————————————

   One surface for finding people, in three tabs.

   These three things all existed already and each had its own door: the ranked
   deck was an overlay, the directory was a card at the bottom of Cohort, and
   the applications inbox was a strip pinned above the deck. Same job, three
   entrances, and the inbox — the only one with a decision waiting on it — was
   the hardest of the three to reach.

     For you    we ranked them        the deck, by affinity overlap
     Discover   you go looking        map + list over the whole roster
     Requests   they picked you       applications in, invitations out

   Requests carries the badge because it is the only tab where someone else is
   waiting on this mentor to act.
*/

/**
 * Local rather than `Seg`, for one reason: Seg keys on the option string, so a
 * label carrying a live count ("Requests · 3") would change identity every time
 * someone accepts. These key on an id and render the count separately.
 */
const TabRow = ({ tabs, value, onChange }) => (
  <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 3, gap: 3 }}>
    {tabs.map((t) => {
      const on = value === t.id;
      return (
        <button key={t.id} onClick={() => onChange(t.id)} aria-pressed={on} style={{
          flex: 1, border: "none", borderRadius: 9, cursor: "pointer", padding: "8px 6px",
          fontFamily: F.sans, fontWeight: 700, fontSize: 12.5,
          background: on ? C.white : "transparent",
          color: on ? C.ink : C.gray,
          boxShadow: on ? "0 1px 3px rgba(26,26,26,.08)" : "none",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {t.label}
          {t.badge > 0 && (
            <span style={{
              minWidth: 16, height: 16, borderRadius: 8, padding: "0 5px",
              background: on ? C.purple : C.purpleTint, color: on ? C.white : C.purple,
              fontFamily: F.mono, fontSize: 9.5, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>{t.badge}</span>
          )}
        </button>
      );
    })}
  </div>
);

export const MenteesScreen = ({
  role = "mentor", back, toast, xp, addXp,
  roster = [], matches = [], onDecide, loading, error, capacity = 4,
  onRequest, onRespond, canRequest, capacityNote, openAccepted,
}) => {
  const [tab, setTab] = useState("foryou");
  const [busy, setBusy] = useState(false);

  const safeMatches = Array.isArray(matches) ? matches : [];
  const inbox = safeMatches.filter((m) => m.awaitingYou);
  const outbox = safeMatches.filter((m) => m.status === "pending" && !m.awaitingYou);
  const accepted = safeMatches.filter((m) => m.status === "accepted");

  /* The inbox answers a match, the deck answers a roster row — two different
     ids, so the tab keeps its own handler rather than reusing the deck's. */
  const respond = async (match, action) => {
    if (busy) return;
    setBusy(true);
    try {
      await onDecide(match, action);
      if (action === "accept") addXp?.(30);
      const first = (match.person?.name || "them").split(" ")[0];
      toast?.(action === "accept" ? `${first} joined your cohort` : "Declined.");
    } catch (e) {
      toast?.(e?.message || "Couldn’t save that. Try again.");
    } finally { setBusy(false); }
  };

  const tabs = [
    { id: "foryou", label: "For you" },
    { id: "discover", label: "Discover" },
    { id: "requests", label: "Requests", badge: inbox.length },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow title="Mentees" onBack={back} />
      <div style={{ padding: "0 20px 10px", flexShrink: 0 }}>
        <TabRow tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {tab === "foryou" && (
          <RequestsScreen
            embedded
            xp={xp} addXp={addXp} toast={toast} onEnterApp={() => {}}
            roster={roster} matches={matches} onDecide={onDecide}
            loading={loading} error={error} capacity={capacity}
          />
        )}

        {tab === "discover" && (
          <DiscoverPane
            role={role} toast={toast}
            onRequest={onRequest} onRespond={onRespond}
            canRequest={canRequest} capacityNote={capacityNote}
            openAccepted={openAccepted}
          />
        )}

        {tab === "requests" && (
          <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 20px 20px" }}>
            {inbox.length === 0 && outbox.length === 0 ? (
              <div style={{ height: 340 }}>
                <EmptyRoster
                  title="Nothing waiting on you."
                  body={accepted.length > 0
                    ? "Applications land here the moment a mentee asks for you. Your cohort is unaffected."
                    : "When a mentee applies to your cohort, their answer shows up here for you to accept or pass."}
                />
              </div>
            ) : (
              <RequestsInbox inbox={inbox} outbox={outbox} busy={busy}
                canAccept={accepted.length < capacity} onRespond={respond} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
