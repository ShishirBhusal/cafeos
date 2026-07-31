# Defense Day Runbook — CafeOS Intelligent Inventory

Everything Rabindra needs on the day, in order. Read once the night before.

---

## 1. Twenty minutes before you present

Run these two things and leave both windows open.

**Terminal 1 — the prediction service**

```
cd "D:\DTI\INVENTORY MANAGEMENT\cafeos\ml-service"
start.bat
```

Wait for `Application startup complete`. Confirm in a browser:
<http://127.0.0.1:8000/health> → should show both model names.

**Terminal 2 — the web application**

```
cd "D:\DTI\INVENTORY MANAGEMENT\cafeos"
npm run dev
```

Log in, open **Saman Hisab** (`/cafe/inventory`). The Smart Reorder panel sits at the top.

> **If the Python window dies mid-demo, nothing breaks.** The page falls back to the old stock
> rule and shows an amber banner. That is a designed feature — if it happens, say so out loud.
> It demonstrates requirement FR-7.

---

## 2. Run MT-01 once, before the defense

This is the one test I could not automate (it spans the browser, the Next.js route, and your
Supabase login). Do it once so you can state the result honestly.

1. Load the inventory screen — confirm the plan renders.
2. Close the Python terminal.
3. Reload the inventory screen.
4. **Expect:** page still renders, amber banner reads "Prediction service offline — showing the
   basic stock rule instead."
5. Restart `start.bat`.

If it behaves as described, MT-01 passes and Section 4.3.2 of the report is verified.

---

## 3. The four numbers to memorise

If you remember nothing else, remember these.

| | |
|---|---|
| Demand forecast R² | **0.8955** |
| Demand forecast MAE | **8.13 units**, 16.4% better than the seasonal baseline |
| Risk classifier accuracy | **77.79%** (macro F1 0.7497) |
| **URGENT recall: model vs old rule** | **82.21% vs 44.84%** |

**The last one is your whole project in one sentence:**

> "For every ten ingredients about to run out, the system CafeOS had before warned about four.
> Mine warns about eight."

---

## 4. Questions you will be asked

**"Is this real data?"**
No, and say so immediately — do not let them discover it. "The live database had about
seventeen real orders, which is nowhere near enough to train a model. So I built a simulator
that models Kathmandu cafe demand — Saturday peaks, the Dashain exodus, monsoon suppression,
perishable spoilage — and trained on that. Every number I'm showing measures whether the models
can recover that structure. It is not a claim about real-world accuracy. Validating on real
trading data is the first item in my future work."

Volunteering this is the strongest move you have. It is in the report at Sections 1.4, 3.4.1 and
4.4.8. An examiner who finds a hidden weakness will press; one who is told openly will move on.

**"Two of your acceptance tests failed."**
"Yes — the classifier missed 80% accuracy by 2.2 points and macro F1 by 0.0003. I set those
thresholds before scoring the test set and didn't move them afterwards. The cause is the WATCH
class: it means 'runs out in four to seven days', which is a narrow band with SAFE on one side
and URGENT on the other. Its precision is 0.57 against 0.88 for SAFE. The errors are between
neighbouring classes, not SAFE-versus-URGENT. And the metric that actually matters — catching
imminent stockouts — passed at 82%."

**"Why Random Forest and not deep learning?"**
"Data volume. Neural forecasting models need far more history than one cafe produces. Tree
ensembles handle mixed categorical and numerical features natively, train in a minute on a
laptop, and I can read the feature importances — which is how I know days-of-cover only accounts
for 17% of the risk decision."

**"How is this different from just calculating days of stock remaining?"**
Your best question — the answer is in Figure 4.7. "That calculation is exactly the rule the
system used before, and it's the model's most important single feature at 16.7%. But the other
83% comes from things the calculation can't express: how long since the last delivery, how
perishable the item is, and how *variable* its consumption is. Two ingredients with identical
days of cover aren't equally risky if one sells steadily and the other spikes on Saturdays. That
difference is why the model catches 82% of stockouts and the rule catches 45%."

**"Why is the WATCH class the weak one?"**
"Because I discretised something continuous. The underlying quantity is 'days until stockout',
and I cut it into three bands. WATCH is bounded on both sides, so marginal cases fall either
way depending on information not available on the snapshot day. If I rebuilt it, I'd predict
days-until-stockout as a regression and let the manager pick their own alert threshold. That's
in my future work."

**"What stops it ordering 100 litres of milk?"**
"Rule R7, the shelf-life cap, and it's deliberately not learned. A model can be wrong about
quantity; it must never be able to recommend a week's supply of a three-day perishable. It's
enforced after pack rounding and after the supplier minimum, and acceptance test MAT-08 checks
it. That test actually caught a real bug — I'd applied the cap before rounding, and rounding up
to a whole pack pushed an order to 3.01 days against a 3-day shelf life. I reordered the rules
and it now comes out at 2.98."

That last answer is worth volunteering unprompted. A student who found a bug in their own safety
logic, through a test they wrote themselves, and says so, reads as an engineer.

---

## 5. Live demo sequence

1. **Show the problem.** Inventory screen, scroll past the panel to the old ingredient list.
   "This is what the system did before — a list, and an alert only once stock is already low."
2. **Show the panel.** "This is what it does now." Point at an `URGENT` row: quantity, cost,
   order-by date, plain-language reason.
3. **Change the horizon** 7 → 14 days. Quantities change. "It's forecasting, not thresholding."
4. **Show the API.** <http://127.0.0.1:8000/docs> → `POST /predict/stockout` → Try it out.
   Shows scikit-learn actually running, with class probabilities.
5. **Show the evidence.** `ml-service/reports/figures/` — confusion matrix (model) next to
   confusion matrix (static rule). The visual difference is the argument.
6. **Show the tests.** Run `test_acceptance.py` live. It prints the failures. Let them see that.

---

## 6. Files the examiners may ask for

| What | Where |
|---|---|
| Full report | `docs/project-report/CafeOS_Project_Report.md` |
| Simulator | `ml-service/generate_dataset.py` |
| Training + evaluation | `ml-service/train_models.py` |
| Service + rule layer | `ml-service/app/main.py` |
| Web integration | `src/app/api/ml/reorder-plan/route.ts` |
| User interface | `src/components/cafe/SmartReorderPanel.tsx` |
| All figures | `ml-service/reports/figures/` |
| Raw metrics | `ml-service/reports/metrics.json` |

---

## 7. Before you submit the report

- [ ] Fill in the title page: your full name, TU registration number, college, supervisor
- [ ] Insert the seven figures from `ml-service/reports/figures/` at their marked positions in
      Chapter 4
- [ ] Render the Mermaid diagrams (Figures 1.1, 3.1–3.10) — paste each block into
      <https://mermaid.live>, export PNG, or redraw in draw.io if your department requires it
- [ ] Convert to DOCX/PDF and fix page numbers in the Table of Contents
- [ ] Run `test_units.py` and `test_acceptance.py` once more and confirm the tables still match
- [ ] Complete MT-01 (Section 2 above) so Section 4.3.2 is verified
