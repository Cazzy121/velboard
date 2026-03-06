#!/bin/bash
SESSIONS_FILE="$HOME/.openclaw/agents/main/sessions/sessions.json"
OUTPUT_FILE="$HOME/.openclaw/workspace/sessions-summary.json"

python3 << 'PYEOF'
import json, time, sys, os

home = os.path.expanduser("~")
SESSIONS_FILE = os.path.join(home, ".openclaw/agents/main/sessions/sessions.json")
OUTPUT_FILE = os.path.join(home, ".openclaw/workspace/sessions-summary.json")

try:
    with open(SESSIONS_FILE) as f:
        d = json.load(f)
except:
    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"error": "Cannot read sessions"}, f)
    sys.exit(0)

now = time.time() * 1000
sessions = []
by_kind = {"main": 0, "cron": 0, "subagent": 0, "dm": 0, "other": 0}
by_model = {}

for k, v in d.items():
    if k.endswith(":main"):
        kind = "main"
    elif ":cron:" in k:
        kind = "cron"
    elif ":subagent:" in k or ":spawn:" in k:
        kind = "subagent"
    elif ":dm:" in k:
        kind = "dm"
    else:
        kind = "other"

    by_kind[kind] = by_kind.get(kind, 0) + 1

    model = v.get("model", "unknown")
    short_model = model.split("/")[-1] if "/" in model else model
    by_model[short_model] = by_model.get(short_model, 0) + 1

    updated = v.get("updatedAt", 0)
    age_mins = (now - updated) / 60000 if updated else 999999

    # Extract user info from origin or key
    origin = v.get("origin", {})
    user_label = ""
    provider = ""
    chat_type = v.get("chatType", "")

    if isinstance(origin, dict):
        user_label = origin.get("label", "")
        provider = origin.get("provider", "")
        if not chat_type:
            chat_type = origin.get("chatType", "")

    # Extract telegram user ID from key
    telegram_id = ""
    if ":telegram:" in k:
        parts = k.split(":")
        for i, p in enumerate(parts):
            if p == "telegram" and i + 2 < len(parts):
                telegram_id = parts[i + 2]
                break

    # Build label
    label = v.get("label", "")
    if not label:
        if kind == "main":
            label = "Main Session"
        elif ":telegram:" in k and user_label:
            label = user_label.split(" (")[0] if " (" in user_label else user_label
        else:
            parts = k.split(":")
            label = parts[-1][:16] if len(parts) > 1 else k[:16]

    max_ctx = v.get("contextTokens", 200000)
    inp = v.get("inputTokens", 0)
    out = v.get("outputTokens", 0)
    total = v.get("totalTokens", 0)
    ctx_pct = round((total / max_ctx) * 100, 1) if max_ctx > 0 and total > 0 else 0

    sessions.append({
        "key": k[:120],
        "kind": kind,
        "label": label[:60],
        "model": short_model,
        "usedTokens": total,
        "maxContextTokens": max_ctx,
        "contextPct": ctx_pct,
        "inputTokens": inp,
        "outputTokens": out,
        "totalTokens": total,
        "updatedAt": updated,
        "ageMins": round(age_mins, 1),
        "active": age_mins < 60,
        "userLabel": user_label[:60],
        "provider": provider,
        "chatType": chat_type,
        "telegramId": telegram_id,
    })

sessions.sort(key=lambda s: s["updatedAt"], reverse=True)
active = [s for s in sessions if s["active"]]

result = {
    "total": len(sessions),
    "active": len(active),
    "byKind": by_kind,
    "byModel": by_model,
    "recent": sessions[:30],
    "ts": int(now),
}

with open(OUTPUT_FILE, "w") as f:
    json.dump(result, f)
PYEOF
