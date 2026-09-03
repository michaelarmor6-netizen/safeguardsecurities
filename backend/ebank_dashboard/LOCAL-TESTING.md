# Running the platform locally

Everything below runs against the **Firebase emulator suite** on your own
machine. Nothing touches the live `e-bank-dashboard` project, and no client data
is involved — the emulators start empty and are seeded with fictional people.

This matters most for the money paths: crediting a wallet is now a Cloud
Function, so testing it means running the functions emulator, not just the app.

## First run

Two terminals, both from `backend/ebank_dashboard`.

**Terminal 1 — the emulator suite.** Builds the functions first, so the emulator
never serves stale JS out of `lib/`:

```powershell
npm run emulators
```

Wait for `All emulators ready`. The suite is then at:

| Emulator  | Port | |
|-----------|------|--|
| Emulator UI | **4200** | inspect and edit data by hand |
| Auth      | 9099 | |
| Firestore | 8080 | |
| Functions | 5001 | |
| Storage   | 9199 | |

**Terminal 2 — seed, then run the app:**

```powershell
npm run seed
npm run dev
```

The app is at <http://localhost:5173>. `.env.local` sets
`VITE_ENABLE_FIREBASE_EMULATORS=true`, which is what makes
`src/config/firebase.ts` point at the emulators instead of production. That file
is gitignored, so it never reaches a build.

## Sign-in

Every seeded account uses the password `Passw0rd!23`.

| Account | Role | Can it move money? |
|---------|------|--------------------|
| `admin@safeguardsecurities.us` | super_admin | yes |
| `finance@safeguard.test` | finance | yes |
| `support@safeguard.test` | support | **no** |
| `compliance@safeguard.test` | compliance | no (KYC only) |
| `alice@example.test` | client | — |
| `ben@example.test` | client | — |
| `chen@example.test` | client | — |

Staff sign in at `/admin-login`, clients at `/login`.

## What to try

**1. Confirm receipt posts to the ledger.**
Funding Requests → Alice's `SG-FUND2600002` ($12,500) → *Confirm receipt &
credit*. Then open the Emulator UI at <http://localhost:4200> and look at both
`wallets` and `cashLedger`. Before this change only the wallet moved; the ledger
row is the fix.

**2. Desk-recorded top-up does the same.**
Funding Requests → *Add funds to a client*. One transaction writes the funding
request, the wallet and the ledger entry together.

**3. Repair a pre-fix deposit.**
Alice's `SG-FUND2600003` ($42,500) is seeded as already funded with **no** ledger
entry — the exact state production is in today. Users → Alice → *Details* →
*Repair statement ledger*. Press it twice; the second run reports nothing to do,
because it is idempotent.

**4. Role separation actually holds.**
Sign in as `support@safeguard.test` and try to confirm a receipt or approve a
request. It fails — support can read everything and change nothing that involves
money. `finance@safeguard.test` succeeds at the same action.

## Resetting

`npm run emulators` persists data to `.emulator-data/` between runs. To start
clean:

```powershell
npm run emulators:fresh   # ignores and does not write .emulator-data
npm run seed
```

## Going back to live data

Delete `.env.local` (or set the flag to `false`) and restart `npm run dev`. The
app then talks to the real project again — with production rules and whatever
functions are actually deployed.

## "Port N is not open… could not start Emulator"

This message has two completely different causes. Check which one you have
before changing any config.

**1. A previous emulator is still running.** The usual case. Closing the
terminal kills the `firebase` parent process but the emulators themselves are
Java children, and they survive — still holding the port. Find and stop it:

```powershell
# What is on the port?
Get-NetTCPConnection -LocalPort 8080 -State Listen |
  ForEach-Object { Get-Process -Id $_.OwningProcess }

# Confirm it is a Firebase emulator before killing anything
Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
  Select-Object ProcessId, CommandLine

# Then stop it by PID
Stop-Process -Id <PID> -Force
```

The command line will name the jar — `cloud-firestore-emulator-*.jar` — which
is how you know it is a leftover of yours and not something else on 8080.

**2. Windows has reserved the port.** Hyper-V and WSL reserve blocks of ports,
and anything inside one fails to bind *even though nothing is listening*, which
makes "port taken" thoroughly misleading. This is why the Emulator UI runs on
**4200** rather than Firebase's default 4000 — 4000 sits inside the reserved
3999–4098 range on this machine. List the current reservations with:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

The ranges change across reboots. If a port that worked yesterday fails today
and nothing is listening on it, this is why — pick a port outside every listed
range and set it in `firebase.json`.

## Automated checks

```powershell
npm test              # money math (22) + Firestore rules (26)
npm run type-check    # tsc -b across the project references
```
