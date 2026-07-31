"""
Render every ```mermaid block in the report to a PNG using mermaid-cli.

Output: docs/project-report/figures/diagram_NN.png
Run:    python render_diagrams.py
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, "CafeOS_Project_Report.md")
OUT = os.path.join(HERE, "figures")
TMP = os.path.join(HERE, ".mmd_tmp")

os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

# Mermaid theme tuned to print legibly in a black-and-white bound report.
CONFIG = os.path.join(TMP, "config.json")
with open(CONFIG, "w") as f:
    f.write("""{
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Times New Roman, serif",
    "fontSize": "15px",
    "primaryColor": "#f2ede7",
    "primaryTextColor": "#1a1a1a",
    "primaryBorderColor": "#4a4a4a",
    "lineColor": "#3a3a3a",
    "secondaryColor": "#e6ded4",
    "tertiaryColor": "#faf7f4",
    "background": "#ffffff",
    "mainBkg": "#f2ede7",
    "nodeBorder": "#4a4a4a",
    "clusterBkg": "#fbf9f7",
    "clusterBorder": "#8a8a8a"
  },
  "flowchart": { "curve": "basis", "nodeSpacing": 40, "rankSpacing": 45 },
  "sequence": { "actorFontFamily": "Times New Roman", "noteFontFamily": "Times New Roman", "messageFontFamily": "Times New Roman" },
  "gantt": { "fontFamily": "Times New Roman" }
}""")

PUPPETEER = os.path.join(TMP, "puppeteer.json")
with open(PUPPETEER, "w") as f:
    f.write('{"args": ["--no-sandbox", "--disable-setuid-sandbox"]}')


def main() -> int:
    with open(REPORT, encoding="utf-8") as f:
        text = f.read()

    blocks = re.findall(r"```mermaid\n(.*?)\n```", text, re.DOTALL)
    if not blocks:
        print("No mermaid blocks found.")
        return 1

    print(f"Found {len(blocks)} mermaid diagrams.\n")
    npx = shutil.which("npx") or "npx"
    failures = []

    for i, block in enumerate(blocks, start=1):
        src = os.path.join(TMP, f"d{i:02d}.mmd")
        dst = os.path.join(OUT, f"diagram_{i:02d}.png")
        with open(src, "w", encoding="utf-8") as f:
            f.write(block)

        cmd = [npx, "-y", "@mermaid-js/mermaid-cli", "-i", src, "-o", dst,
               "-c", CONFIG, "-p", PUPPETEER, "-b", "white", "-s", "3"]
        proc = subprocess.run(cmd, capture_output=True, text=True, shell=(os.name == "nt"))

        first = block.strip().splitlines()[0][:44]
        if os.path.exists(dst):
            kb = os.path.getsize(dst) / 1024
            print(f"  [{i:02d}] OK   {first:<46} -> diagram_{i:02d}.png ({kb:.0f} KB)")
        else:
            failures.append(i)
            print(f"  [{i:02d}] FAIL {first}")
            print("       " + (proc.stderr.strip().splitlines() or ["(no stderr)"])[-1][:160])

    print(f"\nRendered {len(blocks) - len(failures)}/{len(blocks)} to {OUT}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
