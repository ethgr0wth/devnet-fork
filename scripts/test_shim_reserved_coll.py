#!/usr/bin/env python3
"""
Regression test for the reserved-NQL-keyword collection bug.

Root cause: get_doc/query read via `FROM {coll} WHERE …`. The NEDB lexer
(rust/nedb-v2/src/nql.rs) tokenizes a reserved word as a keyword, so a
collection literally named `group` (from the "group:" key prefix) made
`FROM group …` bail — writes persisted (structured /batch, no NQL) but
reads returned nothing → bridged communities 404'd, re-created every sync,
and /api/groups showed 0. Fix: _coll_of suffixes reserved names.

Run: python3 scripts/test_shim_reserved_coll.py
"""
import sys
sys.path.insert(0, "src")

from nedb.redis_shim import _coll_of, _NQL_RESERVED  # noqa: E402

# The lexer's keyword set (rust/nedb-v2/src/nql.rs). If the engine grammar
# gains/loses a keyword, this test fails loudly so the shim set is updated.
NQL_RS_KEYWORDS = {
    "FROM", "AS", "OF", "VALID", "WHERE", "AND", "ORDER", "BY", "DESC",
    "LIMIT", "GROUP", "COUNT", "SUM", "AVG", "MIN", "MAX", "TRACE",
    "TRAVERSE", "REVERSE", "SEARCH", "NOT", "NULL", "TRUE", "FALSE",
}

passed = 0


def check(name, cond):
    global passed
    if cond:
        passed += 1
        print(f"  ok  {name}")
    else:
        print(f"  FAIL {name}")
        raise SystemExit(1)


check("reserved set matches the nql.rs lexer keyword list",
      _NQL_RESERVED == NQL_RS_KEYWORDS)

# the bug: every group:* key must route to a NON-reserved collection, and
# all group sub-keys must agree so the doc + its indexes co-locate.
for k in ("group:0e1d-uuid", "group:members:x", "group:roles:x", "group:slug:x"):
    check(f"{k!r} -> group_ (readable)", _coll_of(k) == "group_")

# generalizes to every reserved prefix
check("order:1 -> order_", _coll_of("order:1") == "order_")
check("search:q -> search_", _coll_of("search:q") == "search_")
check("trace:x -> trace_", _coll_of("trace:x") == "trace_")

# non-reserved collections are untouched (no gratuitous data moves)
for k, exp in {
    "ecosystem:76b9dd": "ecosystem",
    "ecosystem:groups:76b9dd": "ecosystem",
    "user:abc": "user",
    "feed:global": "feed",
    "bridge:groups:u": "bridge",
    "nocolon": "_unrouted",
}.items():
    check(f"{k!r} -> {exp} (unchanged)", _coll_of(k) == exp)

# reserved match is case-insensitive (lexer uppercases before comparing)
check("GROUP:x (any case) -> GROUP_", _coll_of("GROUP:x") == "GROUP_")

print(f"\nAll {passed} tests passed.")
