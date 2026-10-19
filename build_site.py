"""Build the public copy of the「AI 资金流量表」dashboard into docs/ (served by GitHub Pages).

Inputs
  _export/datasets/*.json   dataset documents exported from the Claude dashboard
  _export/blobs/<id>.csv    each dataset's attached file
  _export/files/*.json      the page (index.html) and the image scripts (cw_img_*.js)
  ../bond_tracker/output/tv_bonds.csv   latest bond prices (overrides the exported copy when present)
"""
import datetime as dt
import html
import json
import pathlib
import shutil

HERE = pathlib.Path(__file__).resolve().parent
EXPORT = HERE / "_export"
DOCS = HERE / "docs"
BOND_FEED = HERE.parent / "bond_tracker" / "output" / "tv_bonds.csv"
DASHBOARD_URL = "https://claude.ai/artifact/QbACqPc5RomBDvCj8YdX92"
PARAMS = {"scenario": "公司计划", "shock_lab": "OpenAI", "shock_pct": 30, "year": 2026}


def _doc(path):
    d = json.loads(path.read_text(encoding="utf-8"))
    return d.get("data", d)


def build():
    if DOCS.exists():
        shutil.rmtree(DOCS)
    (DOCS / "data").mkdir(parents=True)

    datasets, latest = {}, ""
    for p in sorted((EXPORT / "datasets").glob("*.json")):
        ds_id, d = p.stem, _doc(p)
        blob = d["source"]["url"].rsplit("/", 1)[-1]
        src = EXPORT / "blobs" / f"{blob}.csv"
        if ds_id == "tv_bonds" and BOND_FEED.exists():
            src = BOND_FEED
        shutil.copyfile(src, DOCS / "data" / f"{ds_id}.csv")
        datasets[ds_id] = {"file": f"{ds_id}.csv", "title": d.get("title", ds_id)}
        latest = max(latest, (d.get("updated") or {}).get("at", ""))

    page = _doc(EXPORT / "files" / "index.html.json")["text"]
    for p in sorted((EXPORT / "files").glob("cw_img_*.js.json")):
        (DOCS / p.name[:-5]).write_text(_doc(p)["text"], encoding="utf-8")
    for name in ("runtime.js", "theme.css"):
        shutil.copyfile(HERE / "src" / name, DOCS / name)

    built = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    bonds_asof = ""
    if (DOCS / "data" / "tv_bonds.csv").exists():
        lines = (DOCS / "data" / "tv_bonds.csv").read_text(encoding="utf-8").splitlines()[1:]
        bonds_asof = max((l.split(",", 1)[0] for l in lines), default="")
    bar = f"研究数据更新于 {latest[:10]}" + (f" · 债券价格截至 {bonds_asof}" if bonds_asof else "") + f" · 页面生成于 {built}"

    (DOCS / "index.html").write_text(f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>AI 资金流量表</title>
<link rel="stylesheet" href="theme.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>window.__DASH_DATASETS = {json.dumps(datasets, ensure_ascii=False)}; window.__DASH_PARAMS = {json.dumps(PARAMS, ensure_ascii=False)};</script>
<script src="runtime.js"></script>
</head>
<body>
<div class="site-bar"><span>{html.escape(bar)}</span><span>仅供内部讨论，不构成投资建议</span></div>
<div id="dash-root">
{page}
</div>
</body>
</html>
""", encoding="utf-8")
    (DOCS / ".nojekyll").write_text("")
    print(f"built docs/ · {len(datasets)} datasets · {bar}")


if __name__ == "__main__":
    build()
