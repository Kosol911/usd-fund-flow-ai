"""USD Fund Flow Analyst — ใช้ MASTER_PROMPT_v2 กับ KNPLAB

usage:
    python usd_analyst.py "วิเคราะห์ USD หลัง CPI ล่าสุด"
    python usd_analyst.py -m opus "..."
    python usd_analyst.py -f question.txt
    echo "..." | python usd_analyst.py -
"""
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "MASTER_PROMPT_v2.md"

MODELS = {
    "default": "deepseek-v4-pro",
    "deepseek": "deepseek-v4-pro",
    "haiku":  "anthropic/claude-haiku-4-5-20251001",
    "sonnet": "anthropic/claude-sonnet-5",
    "opus":   "anthropic/claude-opus-5",
}


def load_env():
    """Fallback chain: ./.env → C:\\PYTHIA\\.env → C:\\Workspace\\m3-bot\\.env → C:\\OCEANUS\\.env"""
    if os.environ.get("KNPLAB_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"):
        return
    for p in [ROOT / ".env",
              Path(r"C:\PYTHIA\.env"),
              Path(r"C:\Workspace\m3-bot\.env"),
              Path(r"C:\OCEANUS\.env")]:
        if not p.exists(): continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line: continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k in ("KNPLAB_API_KEY", "KNPLAB_API_BASE", "ANTHROPIC_API_KEY") and v and not os.environ.get(k):
                os.environ[k] = v
        if os.environ.get("KNPLAB_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"):
            return


def analyze(question, model="default", max_tokens=4000, temperature=0.2, verbose=False):
    load_env()
    if not PROMPT_PATH.exists():
        raise FileNotFoundError(f"prompt missing: {PROMPT_PATH}")
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")

    full_model = MODELS.get(model, model)
    key  = os.environ.get("KNPLAB_API_KEY")
    if not key:
        raise RuntimeError("ไม่พบ KNPLAB_API_KEY — set ใน env หรือ .env")

    base = os.environ.get("KNPLAB_API_BASE", "https://api.knplabai.com/v1").rstrip("/")
    payload = {
        "model": full_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": question},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if verbose:
        print(f"[analyst] model={full_model} tokens={max_tokens} temp={temperature}", file=sys.stderr)
        print(f"[analyst] prompt={len(system_prompt):,} chars", file=sys.stderr)

    t0 = time.time()
    r = requests.post(f"{base}/chat/completions",
                      headers={"Authorization": f"Bearer {key}",
                               "Content-Type": "application/json"},
                      json=payload, timeout=180)
    r.raise_for_status()
    js = r.json()
    elapsed = time.time() - t0

    content = js["choices"][0]["message"]["content"]
    usage = js.get("usage", {})
    if verbose:
        print(f"[analyst] {elapsed:.1f}s in={usage.get('prompt_tokens',0):,} "
              f"out={usage.get('completion_tokens',0):,}", file=sys.stderr)
    return {"content": content, "usage": usage, "elapsed_s": elapsed, "model": full_model}


def main():
    p = argparse.ArgumentParser(prog="usd_analyst", description="USD Fund Flow Analyst")
    p.add_argument("question", nargs="?", help="คำถาม (ใส่ '-' เพื่ออ่านจาก stdin)")
    p.add_argument("-f", "--file", help="อ่านคำถามจากไฟล์")
    p.add_argument("-m", "--model", default="sonnet", choices=list(MODELS.keys()) + ["custom"],
                   help="haiku (เร็ว) / sonnet (default) / opus (ลึก)")
    p.add_argument("--custom-model", help="ชื่อ model เต็มถ้าใช้ -m custom")
    p.add_argument("-t", "--max-tokens", type=int, default=4000)
    p.add_argument("--temp", type=float, default=0.2)
    p.add_argument("--json", action="store_true", help="พิมพ์เป็น JSON")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()

    if args.file:
        q = Path(args.file).read_text(encoding="utf-8").strip()
    elif args.question == "-":
        q = sys.stdin.read().strip()
    elif args.question:
        q = args.question
    else:
        p.error("ต้องมี question หรือ -f")

    model = args.custom_model if args.model == "custom" else args.model
    try:
        res = analyze(q, model=model, max_tokens=args.max_tokens,
                      temperature=args.temp, verbose=args.verbose)
    except Exception as e:
        print(f"[error] {e}", file=sys.stderr); sys.exit(1)

    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(res["content"])
        if args.verbose:
            u = res["usage"]
            print(f"\n--- {res['elapsed_s']:.1f}s · in={u.get('prompt_tokens',0):,} "
                  f"out={u.get('completion_tokens',0):,} · {res['model']} ---", file=sys.stderr)


if __name__ == "__main__":
    main()
