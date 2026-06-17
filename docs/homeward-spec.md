# Homeward — Lost Pet Recovery Network
### Engineering specification (bird & exotic focus) — handoff for Claude Code

> **Working name:** `Homeward` (พากลับบ้าน) — rename freely; keep code identifiers in English.
> **Status:** Greenfield. Build phase-by-phase per Section 16. Do **not** scaffold all phases at once.

---

## 0. ภาพรวมสั้นๆ (Thai TL;DR)

แพลตฟอร์มช่วยตามหาสัตว์เลี้ยงหาย โฟกัส **นกแก้ว/สัตว์เอ็กโซติก** เป็นกลุ่มแรก จุดต่างจากเจ้าอื่น (ที่โฟกัสหมาแมว) คือ:

1. ระบุตัวด้วย **เลขห่วงขา (leg ring)** เป็นหลัก — แม่นกว่า face recognition และคนเจออ่านได้ด้วยตา ไม่ต้องใช้ ML
2. มองว่า **"การพบเห็น" (sighting) เป็นข้อมูลหลัก** ไม่ใช่แค่ "จับได้" เพราะนกถูกเห็นบนหลังคา/ต้นไม้บ่อยกว่าถูกจับ
3. เครือข่ายอาสาแบบ **แบ่งชั้นตามคอมมิตเมนต์** (ตาสอดส่อง → อาสาภาคสนาม → ผู้เชี่ยวชาญ/อุปกรณ์)
4. โตผ่าน **คอมมูนิตี้ + คอนเทนต์** (TikTok สายนก) ไม่ใช่ยิงแอด

เอกสารนี้เขียนเป็นภาษาอังกฤษในส่วนเทคนิคเพื่อให้ coding agent ตีความได้แม่นยำ

---

## 1. Project overview & goals

**Problem.** Pet recovery in Thailand happens in fragmented Facebook/LINE groups. Lost reports and found/sighting reports rarely meet because there is no structured data, no geo-matching, and no coordination. Birds and exotics are especially underserved — facial-recognition tools (e.g. Petco Love Lost) are built for dog/cat faces and do not work for them.

**Goal.** A structured, geo-aware network that (a) lets owners pre-register a pet identity ("passport"), (b) matches lost reports to sightings/found reports automatically, and (c) mobilizes a tiered local volunteer network to recover the animal fast.

**Primary success metric.** Time-to-reunion and reunion rate within the niche community, not raw user count.

**Non-goals (for now).** Replacing Facebook. Dog/cat parity. National coverage on day one. Direct monetization.

---

## 2. Core thesis & design principles

These principles constrain every downstream decision. The agent must respect them.

1. **Ring-first identity.** The leg-ring number is the primary key for identity matching. Microchip second. Visual heuristics last. No machine learning is required for the MVP matcher.
2. **Sighting-first data model.** A `Sighting` (someone saw/heard the animal) is a first-class record, separate from a `FoundReport` (someone physically has it). Most volunteer contributions are sightings. Confirmed sightings re-center the search.
3. **Tiered network, not a flat "searcher" pool.** Most value comes from the wide, low-commitment base ("Eyes") who only report sightings. Active field searchers and specialists (net/ladder/drone/avian-vet) are smaller, higher-commitment tiers.
4. **Hyperlocal density beats broad spread.** Launch in one community/region with intrinsic motivation (bird keepers) before expanding.
5. **Standalone value at the wedge.** The first feature (passport + ring registry + instant poster) must be useful to a single user with zero network, to defeat cold-start.
6. **Trust & safety are core, not bolt-on.** Never expose a precise home location. Verify ownership before any reward handover. Assume valuable animals attract fraud and theft.
7. **Content flywheel.** Reunion stories are shareable content that drives organic growth back into the network. Design data capture so reunions can become content with consent.

---

## 3. Scope

### In scope (build target)
- Pet identity passport with leg-ring registry (birds/parrots first)
- Lost report + public case page + poster generation
- Sighting reporting (any user) + found reporting
- Ring-first matching engine
- Tiered geo-alert dispatch
- Per-case coordination "war room" (zones, searched areas, sightings map, chat)
- Trust/safety: location fuzzing, light verification, reputation, ownership-verified handover
- Notifications via LINE + web push
- Reunion records + volunteer recognition

### Out of scope (later / explicitly deferred)
- Image-similarity / ML matching (Phase 5)
- Facebook-group ingestion/aggregation (Phase 5, via n8n; note ToS/fragility risk)
- Reptiles/sugar gliders/other exotics (add after parrots succeed)
- Payments/marketplace/insurance products
- Native mobile apps (PWA + LINE first)

### MVP definition (must ship together to be useful)
Phases 0–2: passport + ring registry + poster + lost report + public case page + sightings + ring-first matching + basic radius alert. This is the smallest thing that delivers a real reunion.

---

## 4. Tech stack & rationale

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React (PWA), wrapped as a **LINE LIFF** app | Lowest friction in Thailand (no app-store install), works as web too |
| Auth | **LINE Login** (LIFF) primary; email/password fallback | Thai users already have LINE; gives a stable `lineUserId` for push |
| Backend | **Node.js + Express** (or Fastify) | Matches team stack |
| Database | **MongoDB** with `2dsphere` geospatial indexes | Native radius queries (`$near`, `$geoWithin`, `$geoNear`) fit the geo-alert core |
| Media | **Cloudinary** | Already in use; handles image transforms/optimization |
| Push | **LINE Messaging API** (OA push) primary; **Web Push (VAPID)** fallback | Reliable delivery into LINE; web push for non-LINE/PWA |
| Automation | **n8n** | Cross-posting, scheduled bumps, alert fallback, later FB ingestion |
| Maps | Map SDK (Leaflet + a tile provider, or Google Maps JS) | Case map, zones, sighting heatmap |

**Language:** TypeScript end-to-end (shared types between client and server in a `packages/shared` workspace).

---

## 5. System architecture (high level)

```
[ React PWA / LINE LIFF ]
        |  HTTPS (REST + WebSocket for war-room live updates)
        v
[ Express API ]  ---- pub/sub / job queue ---->  [ Dispatch worker ]
   |        |                                          |
   |        |  Cloudinary (media)                       | LINE Messaging API (push)
   |        +-----> MongoDB (2dsphere) <----------------+ Web Push (VAPID)
   |
   +-----> n8n webhooks (cross-post, bump, ingest)
```

- **API service**: REST for CRUD + a WebSocket channel (Socket.IO) per active case for live war-room updates (sightings, zone claims, chat).
- **Dispatch worker**: async job that, on lost-report/confirmed-sighting events, computes recipients and sends tiered notifications. Use a lightweight queue (BullMQ/Redis) or Mongo-backed jobs; keep it swappable.
- **n8n**: triggered via outbound webhooks from the API for side-effects (FB cross-post, scheduled bump). Kept out of the critical path.

---

## 6. User roles & permissions

A user may hold multiple roles. Roles are capabilities, not exclusive types.

| Role | Description | Key permissions |
|---|---|---|
| `owner` | Has registered pet(s) | CRUD own `BirdProfile`, create `LostReport`, manage own case, confirm/reject matches, confirm handover |
| `eyes` (default) | Any signed-in user | Submit `Sighting`, submit `FoundReport`, view public case pages |
| `field_searcher` | Opted-in active volunteer | All `eyes` + receive dispatch, claim zones, mark searched areas, join war-room chat, set availability |
| `specialist` | Verified capability (net/ladder/drone/avian-vet) | All `field_searcher` + tagged for specialist dispatch, shown capability badge |
| `moderator` | Trusted community moderator | Verify specialists, resolve disputes, dismiss false sightings, hide abusive content |
| `admin` | Operator | Full access, parameter tuning, analytics |

**Permission rule of thumb:** owner controls their case; volunteers contribute to it; only owner or moderator can change case state (matched/closed). Precise home/owner location is **never** exposed to any volunteer role.

---

## 7. Data models (MongoDB)

TypeScript-style interfaces. All locations are GeoJSON `Point` as `{ type: "Point", coordinates: [lng, lat] }`. Build a `2dsphere` index on every location field that is queried by proximity.

```ts
// ---- users ----
interface User {
  _id: ObjectId;
  lineUserId?: string;          // unique, from LINE Login
  email?: string;
  displayName: string;
  avatarUrl?: string;
  roles: ("owner"|"eyes"|"field_searcher"|"specialist"|"moderator"|"admin")[];
  homeArea?: {                  // FUZZED public location (snapped to ~500m grid)
    point: GeoPoint;            // 2dsphere
    label?: string;             // e.g. "พฤกษา 116, รังสิต"
  };
  preciseHome?: {               // stored, NEVER returned to other users
    point: GeoPoint;
  };
  searchPrefs?: {
    species: string[];          // species the user opts to be alerted for ([] = all)
    radiusKm: number;           // alert radius, default 3
    available: boolean;         // "available to search now"
    availableUntil?: Date;      // auto-expire availability
    quietHours?: { start: string; end: string }; // "21:00"-"07:00"
  };
  capabilities?: ("net"|"ladder"|"drone"|"avian_vet"|"climber"|"transport")[];
  capabilityVerified?: boolean;
  reputation: number;           // see Section 8E, default 0
  pushTokens?: { webPush?: object[]; };
  createdAt: Date; updatedAt: Date;
}

// ---- birdProfiles (pet passport) ----
interface BirdProfile {
  _id: ObjectId;
  ownerId: ObjectId;
  name: string;                 // e.g. "Very"
  category: "bird";             // future: "reptile" | ...
  species: string;              // "sun_conure", "indian_ringneck", ...
  morphColor?: string;          // free text + tags
  legRing?: {
    number: string;             // raw
    normalized: string;         // uppercased, stripped of spaces/dashes — UNIQUE INDEX
    breederCode?: string;
    year?: number;
  };
  microchipId?: string;         // normalized, unique sparse index
  photos: string[];             // Cloudinary URLs, first = primary
  distinguishingMarks?: string; // missing toe, scar, plumage anomaly...
  soundsWords?: string[];       // words/sounds it knows — useful for ID + luring
  temperament?: string;         // tame/skittish — informs recovery guidance
  status: "home" | "lost" | "found_pending" | "reunited";
  createdAt: Date; updatedAt: Date;
}
// Indexes: { "legRing.normalized": 1 } unique sparse; { ownerId: 1 }; { species: 1 }

// ---- lostReports ----
interface LostReport {
  _id: ObjectId;
  birdProfileId: ObjectId;
  ownerId: ObjectId;
  lastSeenLocation: GeoPoint;   // 2dsphere
  lastSeenAt: Date;
  narrative?: string;
  reward?: { offered: boolean; note?: string }; // never store amounts as escrow
  searchCenter: GeoPoint;       // MUTABLE — recentered by confirmed sightings (2dsphere)
  searchRadiusKm: number;       // default 3, expands over time
  status: "active" | "matched" | "reunited" | "closed";
  posterUrl?: string;           // generated flyer (Cloudinary)
  publicSlug: string;           // for shareable public case page
  windActive?: { dawn: boolean; dusk: boolean }; // optimal search windows
  createdAt: Date; updatedAt: Date;
}
// Indexes: { searchCenter: "2dsphere" }; { lastSeenLocation: "2dsphere" }; { status: 1 }; { publicSlug: 1 } unique

// ---- sightings ----  (first-class; may be unmatched)
interface Sighting {
  _id: ObjectId;
  lostReportId?: ObjectId;      // null if not yet linked to a case
  reporterId: ObjectId;
  location: GeoPoint;           // 2dsphere
  seenAt: Date;
  photos?: string[];
  legRingRead?: string;         // if reporter could read the ring
  speciesGuess?: string;
  note?: string;
  confidence: "low" | "medium" | "high";
  status: "unconfirmed" | "confirmed" | "dismissed";
  createdAt: Date;
}
// Indexes: { location: "2dsphere" }; { lostReportId: 1, seenAt: -1 }; { status: 1 }

// ---- foundReports ----  (someone physically has the animal / a shelter intake)
interface FoundReport {
  _id: ObjectId;
  finderId: ObjectId;
  location: GeoPoint;           // 2dsphere (where found)
  foundAt: Date;
  category: "bird";
  speciesGuess?: string;
  legRingRead?: string;         // normalized when present — strongest match key
  microchipRead?: string;
  photos: string[];
  holdingStatus: "with_finder" | "at_vet" | "at_shelter";
  status: "open" | "matched" | "returned";
  createdAt: Date;
}
// Indexes: { location: "2dsphere" }; { "legRingRead": 1 }; { status: 1 }

// ---- matches ----
interface Match {
  _id: ObjectId;
  lostReportId: ObjectId;
  candidateType: "found_report" | "sighting" | "bird_profile";
  candidateId: ObjectId;
  matchType: "ring" | "microchip" | "heuristic";
  score: number;               // 0..1
  status: "pending" | "confirmed" | "rejected";
  decidedBy?: ObjectId;
  createdAt: Date;
}
// Indexes: { lostReportId: 1, score: -1 }; { status: 1 }

// ---- searchCases (war room) ----
interface SearchCase {
  _id: ObjectId;
  lostReportId: ObjectId;       // 1:1
  zones: {
    zoneId: string;
    polygon: GeoPolygon;        // claimable area
    claimedBy?: ObjectId;
    claimedAt?: Date;
    status: "open" | "claimed" | "searched";
  }[];
  searchedAreas: GeoPolygon[];  // recorded coverage
  participantIds: ObjectId[];
  createdAt: Date; updatedAt: Date;
}

// ---- dispatches (alert log) ----
interface Dispatch {
  _id: ObjectId;
  lostReportId: ObjectId;
  recipientId: ObjectId;
  tier: "eyes" | "field_searcher" | "specialist";
  channel: "line" | "webpush";
  sentAt: Date;
  response: "accepted" | "declined" | "none";
}
// Indexes: { lostReportId: 1, recipientId: 1 } unique (dedup); { sentAt: -1 }

// ---- caseMessages (war-room chat) ----
interface CaseMessage {
  _id: ObjectId;
  lostReportId: ObjectId;
  userId: ObjectId;
  kind: "text" | "geo" | "photo" | "system";
  body?: string;
  location?: GeoPoint;
  mediaUrl?: string;
  createdAt: Date;
}
// Index: { lostReportId: 1, createdAt: 1 }

// ---- reunions (stats / content / badges) ----
interface Reunion {
  _id: ObjectId;
  lostReportId: ObjectId;
  reunitedAt: Date;
  helperIds: ObjectId[];        // credited volunteers
  daysToReunion: number;
  storyConsent: boolean;        // owner consents to public reunion story
}
```

---

## 8. Core algorithms

### 8A. Matching engine (ring-first cascade)

Run whenever a `Sighting` with a ring read, a `FoundReport`, or a new `LostReport` is created. Output ranked `Match` records.

```
function findMatches(candidate):
  normalize candidate.legRingRead / microchipRead (uppercase, strip non-alphanumerics)

  # Tier 1 — exact ring (highest reliability, no ML)
  if candidate.legRingRead:
     hit = BirdProfile.find({ "legRing.normalized": candidate.legRingRead })
     if hit and hit.status in (lost, found_pending):
        return Match(matchType="ring", score=1.0, status="pending")  # near-certain

  # Tier 2 — exact microchip
  if candidate.microchipRead:
     hit = BirdProfile.find({ microchipId: candidate.microchipRead })
     if hit: return Match(matchType="microchip", score=0.98, status="pending")

  # Tier 3/4 — heuristic score against ACTIVE lost reports near the candidate
  actives = LostReport.find(status=active)
            .where(searchCenter within (candidate.location, MAX_HEURISTIC_KM=15))
  for L in actives:
     s = weightedScore(
        species   : 0.40 if exact else 0,
        geo       : 0.30 * geoDecay(distance(candidate.location, L.searchCenter)),  # within radius
        time       : 0.20 * timeDecay(|candidate.seenAt - L.lastSeenAt|),
        color/marks: 0.10 * textSimilarity(candidate, L.bird)
     )
     if s >= HEURISTIC_THRESHOLD (default 0.55):
        emit Match(matchType="heuristic", score=s, status="pending")  # needs human confirm
  return ranked matches desc by score
```

- Ring/microchip matches may **auto-notify** both parties immediately but still require owner confirmation before handover.
- Heuristic matches are **suggestions** — always human-confirmed (owner or moderator).
- `geoDecay`, `timeDecay`: monotonic decreasing (e.g. exponential). All weights/thresholds in a config table (Section 18).

### 8B. Geo-alert dispatch (tiered)

```
on event (LostReport.created OR Sighting.confirmed):
  center = lostReport.searchCenter
  radius = lostReport.searchRadiusKm

  candidates = User.find({
      "searchPrefs.available": true (for field_searcher/specialist tiers),
      homeArea.point within ($near center, radius),
      species pref matches OR empty,
      not in quietHours(now),
  })

  # de-dup against Dispatch (unique lostReportId+recipientId)
  candidates = exclude already-dispatched for this case

  rank by: distance asc, then reputation desc, then capability match
  throttle: cap per wave (e.g. 25) to avoid spam; widen radius next wave if no response

  for each tier:
     eyes          -> light notify ("a {species} is lost near you — keep an eye out")
     field_searcher -> actionable dispatch (accept/decline, opens war room)
     specialist     -> only when case flagged needs_specialist (e.g. rooftop) — capability-filtered

  write Dispatch rows; respect quiet hours (queue for morning unless owner marks URGENT)
```

### 8C. Sighting recenter (the live search-following loop)

```
on Sighting.confirmed(lostReportId):
  recent = Sighting.find({lostReportId, status:confirmed, seenAt > now-12h})
  newCenter = recencyWeightedCentroid(recent)        # newer sightings weigh more
  lostReport.searchCenter = newCenter
  lostReport.searchRadiusKm = clamp(adaptiveRadius(recent), 1, 5)
  recompute zones around newCenter
  re-run dispatch (8B) for the NEW area (only newly-in-range users)
  push war-room update over WebSocket (map recenters, heatmap updates)
```

This is what the radius map (shown in chat) renders against: confirmed sightings drive the live center.

### 8D. War-room zone claiming

```
zones = radialGrid(center, radiusKm, sectors=8, rings=2)   # ~16 claimable cells
claimZone(userId, zoneId):
  atomic update {zoneId, status:"open"} -> {status:"claimed", claimedBy:userId, claimedAt:now}
  if already claimed -> reject (return current claimant)
  TTL: if no activity in 45 min, auto-release back to "open"
markSearched(zoneId): status -> "searched"; append polygon to searchedAreas
```

Prevents duplicate effort; everyone sees claimed/searched coverage live.

### 8E. Location fuzzing (privacy)

```
publicPoint(precisePoint) = snapToGrid(precisePoint, 500m) + smallJitter
- Store preciseHome server-side only.
- API never returns preciseHome to non-owner roles.
- Case "last seen" can be precise (it's not the home); home/owner area is always fuzzed.
```

### 8F. Reputation (anti-abuse, retention)

```
+ confirmed sighting that contributes to a match: +5
+ credited in a reunion: +20
+ verified specialist action: +10
- dismissed/false sighting (by moderator): -10
- abuse report upheld: -25
Use reputation to rank dispatch and to gate specialist verification. Display as tier badges, not raw number.
```

---

## 9. API surface (REST)

Auth via LINE Login → server-issued JWT (httpOnly cookie). `@role` = required role.

```
# Auth
POST   /auth/line                 # exchange LINE id_token -> session
POST   /auth/logout
GET    /me

# Users / prefs
PATCH  /me                        # displayName, homeArea (fuzzed), capabilities
PATCH  /me/search-prefs           # species, radius, availability, quiet hours
POST   /me/push/subscribe         # web push subscription

# Bird passports
POST   /birds                     @owner
GET    /birds/:id
PATCH  /birds/:id                 @owner(self)
GET    /birds?owner=me
GET    /birds/lookup?ring=XXXX    # ring lookup (rate-limited; returns minimal public info)

# Lost reports
POST   /lost-reports              @owner   # creates case + searchCase + triggers dispatch
GET    /lost-reports/:id
GET    /c/:publicSlug             # public case page (no auth)
PATCH  /lost-reports/:id          @owner   # status, narrative, urgent flag
POST   /lost-reports/:id/poster   @owner   # (re)generate flyer -> Cloudinary
GET    /lost-reports?near=lng,lat&radiusKm=3   # active cases near a point

# Sightings
POST   /sightings                 @eyes    # may include lostReportId or be unmatched
GET    /sightings?lostReportId=
PATCH  /sightings/:id/confirm     @owner|@moderator   # triggers recenter (8C)
PATCH  /sightings/:id/dismiss     @owner|@moderator

# Found reports
POST   /found-reports             @eyes
GET    /found-reports/:id
PATCH  /found-reports/:id/status

# Matches
GET    /lost-reports/:id/matches
PATCH  /matches/:id               @owner|@moderator   # confirm/reject

# War room
GET    /cases/:lostReportId
POST   /cases/:lostReportId/zones/:zoneId/claim     @field_searcher
POST   /cases/:lostReportId/zones/:zoneId/searched  @field_searcher
GET    /cases/:lostReportId/messages
POST   /cases/:lostReportId/messages
# WebSocket: /ws/cases/:lostReportId  (live sightings, zone claims, chat, recenter)

# Dispatch responses
POST   /dispatch/:id/respond      # accepted | declined

# Reunion
POST   /lost-reports/:id/reunite  @owner   # closes case, creates Reunion, credits helpers

# Admin
GET    /admin/params ; PATCH /admin/params   @admin   # tune weights/thresholds
```

---

## 10. Key flows (step-by-step)

**A. Register passport (wedge).** Owner signs in with LINE → creates `BirdProfile` (name, species, ring number, photos, marks) → can immediately generate a shareable poster even with no loss event. *Delivers value at 1 user.*

**B. Report lost.** Owner taps "report lost" on a passport → set last-seen location + time → system creates `LostReport` + `SearchCase` + public case page + poster → dispatch worker alerts nearby Eyes (and available field searchers) per 8B.

**C. Sighting.** Any user sees a loose bird → submits `Sighting` (location auto from device, photo, optional ring read) → matcher links it to nearby active cases → owner gets notified → owner confirms → **recenter (8C)** fires → war room map updates, new-area users alerted.

**D. Match & confirm.** Ring/microchip read → near-certain `Match` (auto-notify, score≈1) → owner confirms. Heuristic match → suggestion → owner/moderator confirms. Never auto-close on heuristic.

**E. War room.** Field searchers accept dispatch → join case → claim zones → mark searched areas → drop sightings/photos → on-site guidance card shows (don't chase; play conspecific call / owner's recorded voice; place familiar cage + food; call owner to come). Live via WebSocket.

**F. Handover & reunion.** Finder + owner verify identity via **ring/microchip/passport match** before any reward changes hands (anti-scam). Owner taps "reunited" → `Reunion` created, helpers credited (+reputation, badges), optional consented reunion story surfaced for content.

---

## 11. Notification system

- **Primary:** LINE Messaging API push to `lineUserId` (rich/flex messages with accept/decline + open-war-room buttons).
- **Fallback:** Web Push (VAPID) for PWA users without LINE.
- **Templates:** `eyes_alert`, `searcher_dispatch`, `match_found_owner`, `match_found_finder`, `sighting_confirmed`, `case_reunited`.
- **Quiet hours:** per-user; queue non-urgent until morning; owner can mark a case URGENT to override (use sparingly — dawn/dusk are the high-value windows for birds anyway).
- **Throttle:** cap dispatch waves; widen radius only if no acceptances.

---

## 12. Trust, safety & privacy

- **PDPA (Thailand).** Collect minimum PII; explicit consent for location + push; right to delete account & data; reunion stories require explicit `storyConsent`.
- **Location fuzzing (8E).** Precise home never exposed. Volunteer-facing locations are last-seen/sighting points, not homes.
- **Anti-fraud.** No escrow/payments in-app. Handover gated on ring/microchip/passport verification. Warn users in-flow: never pay a deposit before verified handover.
- **Anti-theft.** Valuable-species cases: do not publicly expose exact owner area; specialist dispatch only to verified users; rate-limit `/birds/lookup`.
- **Moderation.** Report/block; moderators can dismiss false sightings and hide abusive chat; reputation penalties (8F).
- **Sensitive outcomes.** Handle "found deceased" path with a gentle, private flow — not a public status.

---

## 13. n8n automations (side-effects, off critical path)

1. **FB cross-post:** on `LostReport.created`, webhook → n8n → post poster + case link to configured groups.
2. **Scheduled bump:** re-share active cases at dawn/dusk windows; auto-stop on reunion.
3. **Alert fallback:** if no dispatch acceptances after N minutes, n8n widens outreach (e.g. broader FB/LINE post).
4. **Reunion content pipeline:** on consented `Reunion`, draft a short reunion post for review (feeds TikTok/social).
5. **(Phase 5) FB ingestion:** structure incoming lost/found posts from groups into `Sighting`/`FoundReport` candidates. ⚠ Fragile + ToS risk — design as assistive, human-reviewed, not automated scraping at scale.

---

## 14. Non-functional requirements

- **Geo performance:** every proximity query backed by a `2dsphere` index; use `$geoNear` aggregation for ranked distance.
- **Realtime:** war-room updates < 2s via WebSocket.
- **Offline/PWA:** queue sighting submissions offline; sync on reconnect (volunteers in low-signal areas).
- **Rate limiting:** on ring lookup, sighting/found creation, auth.
- **Observability:** structured logs, dispatch metrics (sent/accepted), time-to-first-sighting, time-to-reunion.
- **Config-driven tuning:** weights/thresholds/radii live in an editable params store (Section 18), not hardcoded.
- **i18n:** Thai primary, English fallback; copy in a message catalog.

---

## 15. Edge cases & failure handling

- **Unmatched sighting:** keep as standalone; re-evaluate against future lost reports for a TTL window.
- **Multiple same-species cases nearby:** rank by geo+time; present top candidates to the sighting reporter to disambiguate.
- **False/duplicate sightings:** moderator dismiss; reputation penalty; dedup by reporter+location+time window.
- **Owner unresponsive:** allow a trusted contact / moderator to coordinate; auto-expire stale cases to "closed".
- **Bird flew far (out of radius):** allow manual radius expansion + cross-region alert.
- **Reward dispute:** app facilitates verification only; never holds funds; provide a clear handover checklist.
- **Privacy leak risk:** audit any endpoint that returns location; default to fuzzed.

---

## 16. Phased build plan (for Claude Code)

Build and verify each phase before starting the next. Each phase must meet its acceptance criteria.

**Phase 0 — Foundation**
- Monorepo (pnpm workspaces): `apps/web`, `apps/api`, `packages/shared`.
- TypeScript, lint, env config, MongoDB connection, Cloudinary config.
- LINE Login → JWT session; `User` model; `/me`.
- *Accept:* a user can sign in with LINE and fetch `/me`.

**Phase 1 — Wedge (standalone value)**
- `BirdProfile` CRUD; ring registry with unique normalized index; photo upload to Cloudinary.
- Poster generator (server renders a flyer image → Cloudinary; reuse the lost-poster layout).
- `/birds/lookup?ring=` (rate-limited).
- *Accept:* an owner registers a bird and generates/downloads a poster with zero other users present.

**Phase 2 — Lost + sightings + matching (MVP complete)**
- `LostReport` + public case page (`/c/:slug`) + `SearchCase` skeleton.
- `Sighting` creation (any user) + `FoundReport`.
- Ring-first matcher (8A); `Match` records; owner confirm/reject.
- Basic geo-alert dispatch (8B, eyes tier) via LINE push; `2dsphere` indexes.
- Sighting confirm → recenter (8C); radius map view.
- *Accept:* lost report near user → user gets alert → submits sighting with ring → owner sees a high-confidence match.

**Phase 3 — Tiered network + war room**
- Availability + tiers (field_searcher/specialist); tiered dispatch + accept/decline.
- War room: zones (claim/searched), live map, WebSocket, case chat, on-site guidance cards.
- *Accept:* multiple searchers coordinate one case without overlapping zones; map recenters live.

**Phase 4 — Trust, safety, recognition**
- Location fuzzing enforced; reputation (8F); moderation tools; verified specialists.
- Handover verification flow; `Reunion` + helper credit + badges.
- PDPA: consent flows, data export/delete.
- *Accept:* a full reunion completes with verified handover and credited helpers; no endpoint leaks precise home.

**Phase 5 — Intelligence & reach (deferred)**
- Image-similarity matching (embedding model) as a heuristic booster.
- n8n FB ingestion (assistive, human-reviewed).
- Analytics dashboard; content pipeline.

---

## 17. Suggested repo structure

```
homeward/
  apps/
    web/            # React PWA + LIFF
      src/{features,components,hooks,lib,pages}
    api/            # Express + TS
      src/{routes,controllers,services,models,jobs,ws,lib,config}
  packages/
    shared/         # shared TS types (User, BirdProfile, ... ) + zod schemas
  infra/
    n8n/            # exported workflows
    docker-compose.yml   # mongo, redis (queue), api, web, n8n
  docs/
    homeward-spec.md     # this file
```

---

## 18. Open decisions / tunable parameters

Put these in an `AppParams` collection editable by admin; do not hardcode.

| Param | Default | Notes |
|---|---|---|
| `HEURISTIC_THRESHOLD` | 0.55 | min score to emit heuristic match |
| score weights | species .40 / geo .30 / time .20 / marks .10 | tune from data |
| `MAX_HEURISTIC_KM` | 15 | heuristic search bound |
| default alert radius | 3 km | per-user overridable |
| dispatch wave cap | 25 | anti-spam |
| zone TTL | 45 min | auto-release claim |
| sighting recency window | 12 h | for recenter centroid |
| radius clamp | 1–5 km | search radius bounds |

**Decisions to confirm with stakeholder:**
- LIFF-only vs LIFF + standalone web at launch?
- Queue tech: Redis/BullMQ vs Mongo-backed jobs?
- Map/tile provider (licensing/cost in TH)?
- Which species list to seed first (start: sun conure, green-cheek/crimson-bellied conure, Indian ringneck, cockatiel, African grey, macaw)?

---

## 19. How to use this doc with Claude Code

1. Drop this file in `docs/` and reference it as the source of truth.
2. Ask Claude Code to **build Phase 0 only**, verify it runs, then proceed phase-by-phase. Do not request all phases in one prompt.
3. Generate `packages/shared` types from Section 7 first — everything else imports them.
4. Keep Sections 2 (principles) and 8 (algorithms) in context for every phase; they are the parts most likely to be eroded by incremental coding.
5. Treat Section 18 params as config from day one.
