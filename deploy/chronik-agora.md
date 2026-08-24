# Adding the agora plugin to your chronik node

Stall reads offers through a chronik node running the `agora` plugin. Today that
is three hostnames belonging to one operator, which `PLAN.md` records as one
point of failure wearing three names. Your own node would be the second
operator.

Every claim here was read from the Bitcoin ABC source, and the symbol that
enforces it is named. Where something was **not** checked, it says so.

---

## Read this first. Parts of this can destroy a working index.

**Do this on a second node or a second datadir if you possibly can.** If the
node you are about to touch also serves something else, `PLAN.md` already names
the risk: one incident takes down both. A second node costs an initial sync; it does not cost the live
dashboard. Everything below assumes you decided against that and are touching
the production box anyway.

Four things that go wrong, in the order they bite:

1. **The wipe happens before anything is verified.** `-chronikreindex` sets
   `wipe_db`, and `ChronikIndexer::prepare_db_folder` calls `Db::destroy` on
   `<datadir>/indexes/chronik` at process start — before the HTTP port binds,
   before you read a single log line. If the plugin was misconfigured, you have
   destroyed the index and gained nothing.
2. **Files in the wrong datadir are silent.** `PluginContext::setup` reads
   `<datadir>/plugins.toml`; a missing file logs "Skipping initializing plugins"
   and carries on with an empty context. On a VPS the datadir is frequently not
   `~/.bitcoin`. Wrong path plus `-chronikreindex` equals a full rebuild with no
   agora, then a second full rebuild to actually get it.
3. **The old binary is not a rollback.** With `chronik=1`, a chronik start
   failure aborts the whole process — you lose P2P and RPC too, not just the
   indexer. Worse, this ABC tree is **0.33.10** and writes schema
   `CURRENT_INDEXER_VERSION = 13`; a binary whose current version is lower
   refuses to open it with `ChronikOutdated` ("Upgrade your node"), and
   `LAST_UPGRADABLE_VERSION = 10` only ever helps upgrading. Schema is a
   one-way door.
4. **`agora.py` needs RIPEMD160 from Python.** `hash160` calls
   `hashlib.new("ripemd160")` on every Agora ad. Debian 12+ and Ubuntu 22.04+
   ship OpenSSL 3 with that digest disabled, so the call raises, chronik maps it
   to `PluginRunFailed`, the resync fails and the node does not come up. ABC's
   own `modules/ecash-agora/README.md` step 2 is this exact trap.

**The real rollback artefact is a copy of `indexes/chronik`,** plus a binary
built from the version you are already running. Budget the disk for a second
copy before you begin.

---

## 0. Establish what you are actually running

Not optional, and not guesswork. Three facts decide the whole procedure:

```bash
bitcoind --version
```

Build **that tag**, not this checkout, unless you have decided to move the node
forward on purpose. Building 0.33.10 onto an older live DB upgrades the schema
the first time it starts successfully, and you cannot go back.

Find the datadir the running node actually uses — from `-datadir` on the command
line, `datadir=` in `bitcoin.conf`, or the systemd unit's `ExecStart`:

```bash
systemctl cat bitcoind | grep -i 'ExecStart\|datadir'
```

Every path below means **that** directory. Do not assume `~/.bitcoin`.

Confirm the LOKAD ID index is on. Plugins refuse to start without it —
`PluginSystemRequiresLokadIdIndex`. It is on by default; confirm rather than
assume if `chroniklokadidindex` appears in your conf.

---

## 1. Build with the plugin system

`BUILD_CHRONIK_PLUGINS` is `OFF` by default in ABC's root `CMakeLists.txt`, and
it gates the `plugins` cargo feature. Without it `PluginContext::setup` is a
no-op. So this is a rebuild of bitcoind, not a config change.

The plugin system embeds CPython, so it needs Python headers —
`find_package(Python 3.9 COMPONENTS Development.Embed REQUIRED)`. That is a
minimum, not a pin; Bookworm links `libpython3.11`, and the runtime must match
what the binary linked against.

```bash
sudo apt install python3-dev
```

```bash
cmake -GNinja .. -DBUILD_CHRONIK=ON -DBUILD_CHRONIK_PLUGINS=ON
```

Keep whatever other flags you already build with.

---

## 2. Prove RIPEMD160 works before you touch the index

Run it in the same interpreter the new binary links against:

```bash
python3 -c "import hashlib; hashlib.new('ripemd160'); print('ripemd160 ok')"
```

If that raises `unsupported hash type`, enable the OpenSSL legacy provider in
`openssl.cnf` and re-run until it prints. Doing this after the wipe means a
second outage.

A module that imports is not a plugin that can index. This is the difference.

---

## 3. Place the plugin

Chronik appends `<datadir>/plugins` to `sys.path` and reads
`<datadir>/plugins.toml`.

```bash
mkdir -p <datadir>/plugins
cp <abc-checkout>/modules/ecash-agora/agora.py <datadir>/plugins/agora.py
```

`<datadir>/plugins.toml`:

```toml
[plugin]
agora = {}
```

The key is the module name: `agora` loads `agora.py`, and chronik derives the
class as `AgoraPlugin`. For mainnet `[plugin]` and `[main.plugin]` are merged
and mean the same thing — declaring it in both is `DuplicatePlugin`, not an
override.

Copy from the tree you built. The `chronik_plugin` API the module imports is
embedded in the binary, so a module from a different tree can import against a
different API. Note that `PluginVersionMismatch` compares the plugin's
`version()` **string** — currently `"0.1.0"` — not the file's bytes, so editing
the file without bumping that string loads silently and writes a different
index.

---

## 4. Dry run — the step that makes this safe

Start the new binary with the plugin in place and **without** `-chronikreindex`:

```bash
bitcoind -chronik
```

You are looking for two lines. `Plugin context initialized Python <version>`
means the plugin system came up, and then it should refuse to start with
`PluginsAlreadyHaveTxs` — "there are already matching txs in the DB for their
LOKAD IDs". **That refusal is the success signal.** Agora's LOKAD is `AGR0`
(`LOKAD_ID` in `agora.py`) and Agora has been live since 2024, so those
transactions exist.

Crucially, `update_plugins_index` returns that error **before** it writes
anything, so this dry run leaves your database intact. If instead you see
`Failed loading plugin agora`, fix that now — the reindex would not have fixed
it and would have cost you the index.

The error text also offers a third option: park the block and index forward.
That is real — ABC's own `chronik_plugins_setup.py` does exactly that — but it
is a *node* rewind, and for a LOKAD live since 2024 it means parking roughly two
years of chain on the box that serves your dashboard. Worse than the reindex.
Do not take it.

---

## 5. Back up, then reindex

```bash
cp -a <datadir>/indexes/chronik <datadir>/indexes/chronik.bak
```

Then:

```bash
bitcoind -chronik -chronikreindex
```

`-chronikreindex` alone is a no-op unless chronik is enabled — `DEFAULT_CHRONIK`
is false — so pass both. It rebuilds only chronik's database; the help text is
"Reindex the Chronik indexer from genesis, but leave the other indexes
untouched". You are not re-validating the blockchain.

It is a full chronik rebuild from genesis on an archival node, so budget hours,
not minutes. Note `-prune` is incompatible with `-chronik`, so there is no small
version of this.

A **clean** stop mid-reindex is recoverable: shutdown is checked during resync,
it logs "Stopped re-sync adding blocks", and the next start **without** the flag
continues from the last committed height. Passing `-chronikreindex` again starts
from zero. Take the flag out of your systemd unit after the first start.

I have not measured the wall time, disk or RAM this takes on your box.

---

## 6. Verify from outside

Chronik's HTTP API is **protobuf**, not JSON — `CONTENT_TYPE_PROTOBUF` is
`application/x-protobuf`. A working node returns a binary body, so `curl` piped
to `head` looks like garbage on success. Do not read that as failure.

Check the status code, not the body:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://your-node.example/plugin/agora/00/utxos
```

`200` is loaded; `404` is not. The human-readable `Plugin "agora" not loaded`
string lives inside the protobuf error body, which is what Stall's
`isPluginMissing` matches.

Better, ask it the way Stall does — `scripts/verify-live-stall.mjs` probes every
host through `ChronikClient` and prints each one's result.

One caution: a 404 does not prove the binary lacks the plugin feature. A
plugins-enabled binary with no `plugins.toml` returns the identical 404, because
the `/plugin/...` routes are not feature-gated.

---

## 7. Only then, add it to Stall

`CHRONIK_HOSTS` in `src/net/hosts.ts`, and nowhere else — the CSP `connect-src`
is derived from that constant, and `src/csp.test.ts` fails if the deployed
copies drift.

**Do not add a node that lacks the plugin.** `FailoverProxy._request` only moves
on for errors carrying a `code`, an undecodable body, or a trimmed message
ending in `:` — a decoded 404 is thrown. A plugin-less host in the list breaks
the app rather than slowing it.

`createChronik` uses constructor order, not closest-first. Putting your node
first makes it preferred, and makes it the first thing that breaks.
