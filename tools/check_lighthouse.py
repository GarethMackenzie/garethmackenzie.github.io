from pathlib import Path
import json
import sys

REPORTS = Path("qa-reports/lighthouse")
THRESHOLDS = {
    "performance": 0.80,
    "accessibility": 0.95,
    "best-practices": 0.90,
    "seo": 0.95,
}

failures = []
files = sorted(REPORTS.glob("*.json"))
if not files:
    print("No Lighthouse reports found.")
    sys.exit(1)

for path in files:
    data = json.loads(path.read_text(encoding="utf-8"))
    categories = data.get("categories", {})
    audits = data.get("audits", {})
    print(f"\n{path.name}")
    for category, threshold in THRESHOLDS.items():
        score = categories.get(category, {}).get("score")
        if score is None:
            failures.append(f"{path.name}: missing {category} score")
            continue
        print(f"  {category:15} {score * 100:5.1f}")
        if score < threshold:
            failures.append(
                f"{path.name}: {category} score {score * 100:.1f} below {threshold * 100:.0f}"
            )

    metrics = {
        "FCP": "first-contentful-paint",
        "LCP": "largest-contentful-paint",
        "Speed Index": "speed-index",
        "TBT": "total-blocking-time",
        "CLS": "cumulative-layout-shift",
    }
    for label, audit_id in metrics.items():
        audit = audits.get(audit_id, {})
        display = audit.get("displayValue")
        numeric = audit.get("numericValue")
        if display is not None:
            print(f"  {label:15} {display}")
        elif numeric is not None:
            print(f"  {label:15} {numeric}")

if failures:
    print("\nLighthouse budget failures:")
    for failure in failures:
        print(f"  FAIL {failure}")
    sys.exit(1)

print("\nLighthouse budgets passed.")
