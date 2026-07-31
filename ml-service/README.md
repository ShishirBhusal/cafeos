# CafeOS ML Service

The predictive inventory layer for CafeOS. Two supervised models plus a deterministic rule
layer, served over HTTP to the Next.js application.

| Model | Type | Answers |
|---|---|---|
| **Demand Forecaster** | Random Forest Regressor | "How many of this item will sell tomorrow?" |
| **Stockout Risk Classifier** | Random Forest Classifier | "What am I about to run out of?" |

---

## ⚠️ Data disclosure — read this first

**All training and evaluation data is synthetic.** The live CafeOS database holds roughly
seventeen genuine point-of-sale orders — far below what supervised learning requires. The
simulator in `generate_dataset.py` produces the training data instead.

Every accuracy figure below measures the models' ability to recover structure the simulator
deliberately inserted. **None of it is evidence of real-world forecasting accuracy.** This is
stated in the project report at Sections 1.4, 3.4.1 and 4.4.8, and must not be dropped when
presenting the work.

---

## Quick start

```bat
REM From this directory — creates the venv, trains the models, and starts the service
start.bat
```

Then check <http://127.0.0.1:8000/health>. Interactive API docs are at
<http://127.0.0.1:8000/docs>.

Manual equivalent:

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe generate_dataset.py     # ~30 s
.venv/Scripts/python.exe train_models.py         # ~60 s
.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

---

## Results

Scored once on a chronologically held-out test window (the final 15% of days).

**Model 1 — Demand Forecaster**

| Metric | Value |
|---|---|
| R² | 0.8955 |
| MAE | 8.13 units |
| RMSE | 10.92 units |
| Improvement over "same weekday last week" | 16.4% |

**Model 2 — Stockout Risk Classifier**

| Metric | Model | Static rule (what CafeOS shipped before) |
|---|---|---|
| Accuracy | 77.79% | 50.14% |
| Macro F1 | 0.7497 | 0.4727 |
| **URGENT recall** | **82.21%** | **44.84%** |

The last row is the headline. Of ingredients that genuinely were about to run out, the old
threshold rule caught fewer than half; the model catches over four in five.

**Acceptance tests: 7 passed, 2 failed** (77.78%). The classifier missed its 80% accuracy and
0.75 macro-F1 targets. Both failures are reported, not adjusted away — see Section 4.4.7 of the
report for the analysis (the ambiguous `WATCH` class).

---

## Layout

```
ml-service/
├── generate_dataset.py     Simulator — 18 months of Kathmandu cafe operation
├── train_models.py         Training, candidate selection, evaluation, figures
├── test_units.py           16 unit tests (Table 4.3 of the report)
├── test_acceptance.py      9 acceptance criteria (Table 4.6)
├── requirements.txt        Pinned dependencies
├── start.bat               One-click launcher
├── app/main.py             FastAPI service + rule layer
├── data/                   Generated CSVs
├── models/                 Serialised .joblib bundles
└── reports/
    ├── metrics.json        Every figure quoted in Chapter 4
    ├── unit_tests.csv
    ├── acceptance_tests.csv
    └── figures/            Figures 4.1 – 4.7
```

---

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe; returns loaded model names |
| GET | `/metrics` | Evaluation figures |
| POST | `/predict/demand` | Model 1 — next-day units per menu item |
| POST | `/predict/stockout` | Model 2 — risk class per ingredient |
| POST | `/reorder-plan` | Both models + rule layer → purchase list |

The service binds to `127.0.0.1` only. The browser never reaches it directly; all access goes
through the authenticated Next.js route at `/api/ml/reorder-plan`.

---

## The rule layer

Model output is advisory. Eight deterministic rules turn it into a purchase decision, and the
safety rules override the models:

1. **R1** Recipe explosion — forecast units × quantity per serving × waste factor
2. **R2** Fallback requirement where no recipe exists
3. **R3** Shortfall = requirement − stock − incoming
4. **R4** `URGENT` top-up even when arithmetic says otherwise
5. **R5** Round up to whole supplier packs
6. **R6** Respect supplier minimum order quantity
7. **R7** **Shelf-life cap — applied last, overrides R4–R6**
8. **R8** Order-by date from risk class and supplier lead time

R7 is a guarantee, not a preference. A model may be wrong about quantity; it must never be able
to recommend a week's supply of a three-day perishable. Acceptance test MAT-08 enforces this —
and caught a real breach during development, when the cap was applied *before* pack rounding and
rounding pushed the order to 3.01 days of supply against a 3-day shelf life.

---

## Retraining

```bash
.venv/Scripts/python.exe generate_dataset.py
.venv/Scripts/python.exe train_models.py
.venv/Scripts/python.exe test_units.py
.venv/Scripts/python.exe test_acceptance.py
```

All randomness is seeded (`default_rng(20260731)`, `random_state=42`), so results reproduce
exactly. Restart the service afterwards to load the new bundles.

---

## VS Code note

If the editor reports "Cannot find module `fastapi`", it is pointing at the system Python rather
than the project venv. Select `ml-service/.venv/Scripts/python.exe` via
**Python: Select Interpreter**. This does not affect running the service.
