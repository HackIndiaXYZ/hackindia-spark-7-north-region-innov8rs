import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { generateAIInsight } from "./aiInsight";
import "./App.css";

const API_URL = "http://127.0.0.1:5000/predict"; /*https://jd17rsj9-5000.inc1.devtunnels.ms/predict */

const initialForm = {
  "Age (yrs)": 25,
  "Weight (Kg)": 60,
  "Height(Cm)": 160,
  "Cycle length(days)": 28,
  "Weight gain(Y/N)": 0,
  "hair growth(Y/N)": 0,
  "Skin darkening (Y/N)": 0,
  "Pimples(Y/N)": 0,
  "Fast food (Y/N)": 0,
  "Reg.Exercise(Y/N)": 1,
  "Follicle No. (L)": 5,
  "Follicle No. (R)": 5,
  "AMH(ng/mL)": 3.5,
  "FSH(mIU/mL)": 7,
  "LH(mIU/mL)": 8,
  "Waist:Hip Ratio": 0.83,
};

const yesNoFields = [
  "Weight gain(Y/N)",
  "hair growth(Y/N)",
  "Skin darkening (Y/N)",
  "Pimples(Y/N)",
  "Fast food (Y/N)",
  "Reg.Exercise(Y/N)",
];

const sections = [
  {
    title: "Basic Profile",
    subtitle: "General body and cycle information",
    fields: ["Age (yrs)", "Weight (Kg)", "Height(Cm)", "Cycle length(days)"],
  },
  {
    title: "Observable Symptoms",
    subtitle: "Common signs considered during screening",
    fields: [
      "Weight gain(Y/N)",
      "hair growth(Y/N)",
      "Skin darkening (Y/N)",
      "Pimples(Y/N)",
      "Fast food (Y/N)",
      "Reg.Exercise(Y/N)",
    ],
  },
  {
    title: "Clinical Indicators",
    subtitle: "Optional lab and ultrasound values",
    fields: [
      "Follicle No. (L)",
      "Follicle No. (R)",
      "AMH(ng/mL)",
      "FSH(mIU/mL)",
      "LH(mIU/mL)",
      "Waist:Hip Ratio",
    ],
  },
];

function readableField(field) {
  const names = {
    "Age (yrs)": "Age",
    "Weight (Kg)": "Weight",
    "Height(Cm)": "Height",
    "Cycle length(days)": "Cycle Length",
    "Weight gain(Y/N)": "Sudden Weight Gain",
    "hair growth(Y/N)": "Excess Hair Growth",
    "Skin darkening (Y/N)": "Skin Darkening",
    "Pimples(Y/N)": "Acne / Pimples",
    "Fast food (Y/N)": "Frequent Fast Food",
    "Reg.Exercise(Y/N)": "Regular Exercise",
    "Follicle No. (L)": "Left Follicle Count",
    "Follicle No. (R)": "Right Follicle Count",
    "AMH(ng/mL)": "AMH",
    "FSH(mIU/mL)": "FSH",
    "LH(mIU/mL)": "LH",
    "Waist:Hip Ratio": "Waist-Hip Ratio",
  };

  return names[field] || field;
}

/* ================= SMART HIGHLIGHTS FUNCTION ================= */

function getSmartHighlights(form) {
  const highlights = [];

  const totalFollicles =
    Number(form["Follicle No. (L)"]) + Number(form["Follicle No. (R)"]);
  const amh = Number(form["AMH(ng/mL)"]);
  const lh = Number(form["LH(mIU/mL)"]);
  const fsh = Number(form["FSH(mIU/mL)"]);
  const cycle = Number(form["Cycle length(days)"]);
  const whr = Number(form["Waist:Hip Ratio"]);

  if (cycle > 32) {
    highlights.push({
      title: "Irregular cycle pattern",
      detail: "Cycle length is higher than the typical range.",
    });
  }

  if (totalFollicles > 20) {
    highlights.push({
      title: "High follicle count",
      detail: "Combined follicle count is elevated.",
    });
  }

  if (amh > 5) {
    highlights.push({
      title: "Elevated AMH",
      detail: "AMH value is high compared to common screening ranges.",
    });
  }

  if (lh > fsh) {
    highlights.push({
      title: "LH greater than FSH",
      detail: "LH/FSH pattern may be relevant in PCOS screening.",
    });
  }

  if (whr >= 0.85) {
    highlights.push({
      title: "Higher waist-hip ratio",
      detail: "Waist-hip ratio suggests a higher metabolic risk signal.",
    });
  }

  if (form["Weight gain(Y/N)"] === 1) {
    highlights.push({
      title: "Weight gain reported",
      detail: "Sudden weight gain is marked as present.",
    });
  }

  if (form["hair growth(Y/N)"] === 1) {
    highlights.push({
      title: "Excess hair growth reported",
      detail: "This is one of the visible symptoms considered in screening.",
    });
  }

  if (form["Pimples(Y/N)"] === 1) {
    highlights.push({
      title: "Acne / pimples reported",
      detail: "Skin symptoms are included as observable indicators.",
    });
  }

  if (form["Fast food (Y/N)"] === 1) {
    highlights.push({
      title: "Frequent fast food intake",
      detail: "Lifestyle pattern may contribute to overall risk context.",
    });
  }

  if (form["Reg.Exercise(Y/N)"] === 0) {
    highlights.push({
      title: "Low regular exercise",
      detail: "Sedentary lifestyle is treated as a modifiable factor.",
    });
  }

  if (highlights.length === 0) {
    highlights.push({
      title: "No major visible flags",
      detail: "Current inputs do not show strong obvious warning patterns.",
    });
  }

  return highlights.slice(0, 5);
}

/* ================= END SMART HIGHLIGHTS FUNCTION ================= */


/* ================= EXPLAINABLE IMPORTANCE BARS FUNCTION ================= */

function getImportanceBars(form) {
  const totalFollicles =
    Number(form["Follicle No. (L)"]) + Number(form["Follicle No. (R)"]);

  const lh = Number(form["LH(mIU/mL)"]);
  const fsh = Number(form["FSH(mIU/mL)"]);

  const bars = [
    {
      label: "Follicle Count",
      value: totalFollicles > 20 ? 95 : Math.min((totalFollicles / 20) * 70, 70),
    },
    {
      label: "AMH Level",
      value: Number(form["AMH(ng/mL)"]) > 5
        ? 90
        : Math.min((Number(form["AMH(ng/mL)"]) / 5) * 65, 65),
    },
    {
      label: "Cycle Pattern",
      value: Number(form["Cycle length(days)"]) > 32
        ? 82
        : Math.min((Number(form["Cycle length(days)"]) / 32) * 55, 55),
    },
    {
      label: "LH / FSH Pattern",
      value: lh > fsh ? 76 : 35,
    },
    {
      label: "Visible Symptoms",
      value:
        (form["Weight gain(Y/N)"] +
          form["hair growth(Y/N)"] +
          form["Skin darkening (Y/N)"] +
          form["Pimples(Y/N)"]) *
        22,
    },
    {
      label: "Lifestyle Signals",
      value:
        (form["Fast food (Y/N)"] * 35) +
        (form["Reg.Exercise(Y/N)"] === 0 ? 35 : 0),
    },
  ];

  return bars
    .map((bar) => ({
      ...bar,
      value: Math.min(Math.round(bar.value), 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/* ================= END EXPLAINABLE IMPORTANCE BARS FUNCTION ================= */


/* ================= OFFLINE MODE FUNCTION (REMOVE IF NOT NEEDED) ================= */

function offlineEstimate(form) {
  let score = 0;

  if (form["Cycle length(days)"] > 32) score += 15;
  if (form["Weight gain(Y/N)"]) score += 8;
  if (form["hair growth(Y/N)"]) score += 10;
  if (form["Skin darkening (Y/N)"]) score += 8;
  if (form["Pimples(Y/N)"]) score += 6;
  if (form["Fast food (Y/N)"]) score += 5;
  if (!form["Reg.Exercise(Y/N)"]) score += 6;

  const totalFollicles =
    Number(form["Follicle No. (L)"]) + Number(form["Follicle No. (R)"]);

  if (totalFollicles > 20) score += 18;
  if (form["AMH(ng/mL)"] > 5) score += 12;
  if (form["LH(mIU/mL)"] > form["FSH(mIU/mL)"]) score += 8;
  if (form["Waist:Hip Ratio"] >= 0.85) score += 6;

  const percentage = Math.min(Math.max(score, 5), 95);
  const prediction = percentage >= 35 ? 1 : 0;

  return {
    probability: percentage / 100,
    percentage,
    threshold: 0.35,
    prediction,
    label: prediction
      ? "Offline Estimate: Higher PCOD/PCOS Risk Pattern"
      : "Offline Estimate: No Major Risk Pattern",
    offline: true,
  };
}

/* ================= END OFFLINE MODE FUNCTION ================= */

function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState("analyze");
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("mlReports")) || [];
    setHistory(saved);
  }, []);

  function goTo(target) {
    setPage(target);
    setMenuOpen(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  }

  /* ================= DEMO PRESETS FUNCTION (REMOVE IF NOT NEEDED) ================= */

  function applyPreset(type) {
    setAiInsight("");
    setResult(null);

    if (type === "low") {
      setForm({
        ...initialForm,
        "Age (yrs)": 24,
        "Weight (Kg)": 56,
        "Height(Cm)": 162,
        "Cycle length(days)": 28,
        "Weight gain(Y/N)": 0,
        "hair growth(Y/N)": 0,
        "Skin darkening (Y/N)": 0,
        "Pimples(Y/N)": 0,
        "Fast food (Y/N)": 0,
        "Reg.Exercise(Y/N)": 1,
        "Follicle No. (L)": 5,
        "Follicle No. (R)": 5,
        "AMH(ng/mL)": 3.0,
        "FSH(mIU/mL)": 7,
        "LH(mIU/mL)": 7,
        "Waist:Hip Ratio": 0.78,
      });
    }

    if (type === "borderline") {
      setForm({
        ...initialForm,
        "Age (yrs)": 27,
        "Weight (Kg)": 68,
        "Height(Cm)": 160,
        "Cycle length(days)": 32,
        "Weight gain(Y/N)": 1,
        "hair growth(Y/N)": 0,
        "Skin darkening (Y/N)": 0,
        "Pimples(Y/N)": 1,
        "Fast food (Y/N)": 1,
        "Reg.Exercise(Y/N)": 0,
        "Follicle No. (L)": 9,
        "Follicle No. (R)": 10,
        "AMH(ng/mL)": 4.8,
        "FSH(mIU/mL)": 7,
        "LH(mIU/mL)": 8.5,
        "Waist:Hip Ratio": 0.85,
      });
    }

    if (type === "pcos") {
      setForm({
        ...initialForm,
        "Age (yrs)": 26,
        "Weight (Kg)": 78,
        "Height(Cm)": 158,
        "Cycle length(days)": 35,
        "Weight gain(Y/N)": 1,
        "hair growth(Y/N)": 1,
        "Skin darkening (Y/N)": 1,
        "Pimples(Y/N)": 1,
        "Fast food (Y/N)": 1,
        "Reg.Exercise(Y/N)": 0,
        "Follicle No. (L)": 15,
        "Follicle No. (R)": 16,
        "AMH(ng/mL)": 8.5,
        "FSH(mIU/mL)": 6,
        "LH(mIU/mL)": 15,
        "Waist:Hip Ratio": 0.92,
      });
    }
  }

  /* ================= END DEMO PRESETS FUNCTION ================= */

  async function handlePredict(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setAiInsight("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      saveToHistory(data, false);
      setPage("result");
    } catch {
      const fallback = offlineEstimate(form);
      setResult(fallback);
      saveToHistory(fallback, true);
      setPage("result");
    }

    setLoading(false);
  }

  function saveToHistory(data, offline = false) {
    const report = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      inputs: form,
      result: { ...data, offline },
      highlights: getSmartHighlights(form),
      importanceBars: getImportanceBars(form),
    };

    const updated = [report, ...history];
    setHistory(updated);
    localStorage.setItem("mlReports", JSON.stringify(updated));
  }

  async function handleGenerateInsight() {
    if (!result || result.error) return;

    setAiLoading(true);
    const text = await generateAIInsight({ result, form });
    setAiInsight(text);
    setAiLoading(false);
  }

  function downloadPDF(
    reportResult = result,
    reportInputs = form,
    insight = aiInsight,
    highlights = getSmartHighlights(reportInputs),
    importanceBars = getImportanceBars(reportInputs)
  ) {
    if (!reportResult || reportResult.error) return;

    const doc = new jsPDF();

    doc.setFillColor(123, 45, 79);
    doc.rect(0, 0, 210, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("herHealthAI Diagnostics Report", 20, 18);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.text("Educational awareness report. Not a medical diagnosis.", 20, 38);

    doc.setFontSize(14);
    doc.text("Result Summary", 20, 55);

    doc.setFontSize(12);
    doc.text(`Prediction: ${reportResult.label}`, 25, 68);
    doc.text(`Model Probability: ${reportResult.percentage}%`, 25, 78);
    doc.text(`Threshold: ${reportResult.threshold}`, 25, 88);
    doc.text(
      `Mode: ${
        reportResult.offline ? "Offline fallback estimate" : "ML backend prediction"
      }`,
      25,
      98
    );

    let y = 116;

    doc.setFontSize(14);
    doc.text("Explainable Importance Signals", 20, y);
    y += 10;

    doc.setFontSize(11);
    importanceBars.forEach((bar, index) => {
      doc.text(`${index + 1}. ${bar.label}: ${bar.value}/100`, 25, y);
      y += 7;
    });

    y += 6;
    doc.setFontSize(14);
    doc.text("Smart Highlights", 20, y);
    y += 10;

    doc.setFontSize(11);
    highlights.forEach((item, index) => {
      const line = `${index + 1}. ${item.title}: ${item.detail}`;
      const split = doc.splitTextToSize(line, 165);
      doc.text(split, 25, y);
      y += split.length * 6 + 4;
    });

    if (insight) {
      y += 6;
      doc.setFontSize(14);
      doc.text("AI Insight", 20, y);
      y += 10;

      doc.setFontSize(11);
      const splitInsight = doc.splitTextToSize(insight, 165);
      doc.text(splitInsight, 25, y);
      y += splitInsight.length * 6 + 8;
    }

    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text("Input Snapshot", 20, y);
    y += 12;

    sections.forEach((section) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(section.title, 20, y);
      y += 8;

      doc.setFontSize(10);
      section.fields.forEach((field) => {
        doc.text(`${readableField(field)}: ${reportInputs[field]}`, 25, y);
        y += 7;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 4;
    });

    doc.save(`herHealthAI-report-${Date.now()}.pdf`);
  }

  function clearHistory() {
    localStorage.removeItem("mlReports");
    setHistory([]);
  }

  const isHighRisk = result && !result.error && result.prediction === 1;
  const smartHighlights = getSmartHighlights(form);
  const importanceBars = getImportanceBars(form);

  const chartData = history
    .slice()
    .reverse()
    .map((item, index) => ({
      name: `Report ${index + 1}`,
      score: item.result.percentage,
      date: item.date,
    }));

  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <button className="hamburger" onClick={() => setMenuOpen(true)}>
          ☰
        </button>

        <div className="brand">
          <div className="brand-mark">h</div>
          <div>
            <strong>herHealthAI</strong>
            <span>Diagnostics</span>
          </div>
        </div>
      </header>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <aside className={`drawer ${menuOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h2>herHealthAI</h2>
          <button onClick={() => setMenuOpen(false)}>×</button>
        </div>

        <button onClick={() => goTo("analyze")}>Analyze</button>
        <button onClick={() => goTo("result")}>Result</button>
        <button onClick={() => goTo("history")}>History</button>

        <div className="drawer-note">
          PCOD / PCOS screening for awareness only.
        </div>
      </aside>

      <main className="app-page">
        {page === "analyze" && (
          <>
            <section className="hero-mobile">
              <span className="eyebrow">ML-powered screening</span>
              <h1>Analyze PCOD/PCOS risk</h1>
              <p>
                Fill lifestyle, symptom, and clinical indicators to generate a
                model-based awareness report.
              </p>
            </section>

            {/* ================= DEMO PRESETS (REMOVE IF NOT NEEDED) ================= */}

            <div className="preset-box">
              <h3>Quick Demo Presets</h3>
              <p>Use sample profiles to test the model flow quickly.</p>

              <div className="preset-actions">
                <button type="button" onClick={() => applyPreset("low")}>
                  Low Risk
                </button>
                <button type="button" onClick={() => applyPreset("borderline")}>
                  Borderline
                </button>
                <button type="button" onClick={() => applyPreset("pcos")}>
                  Typical PCOS
                </button>
              </div>
            </div>

            {/* ================= END DEMO PRESETS ================= */}

            <form onSubmit={handlePredict}>
              {sections.map((section, index) => (
                <section className="panel" key={section.title}>
                  <div className="section-heading">
                    <span>{index + 1}</span>
                    <div>
                      <h2>{section.title}</h2>
                      <p>{section.subtitle}</p>
                    </div>
                  </div>

                  <div className="field-grid">
                    {section.fields.map((field) => (
                      <label className="field" key={field}>
                        <span>{readableField(field)}</span>

                        {yesNoFields.includes(field) ? (
                          <select
                            name={field}
                            value={form[field]}
                            onChange={handleChange}
                          >
                            <option value={0}>No</option>
                            <option value={1}>Yes</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            name={field}
                            value={form[field]}
                            onChange={handleChange}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </section>
              ))}

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Running ML model..." : "Analyze Risk"}
              </button>
            </form>
          </>
        )}

        {page === "result" && (
          <section className="result-screen">
            {!result && (
              <div className="panel">
                <span className="eyebrow">No result yet</span>
                <h1>Run an analysis first</h1>
                <p className="muted">
                  Go to the Analyze page and submit the assessment to generate a
                  result.
                </p>
                <button onClick={() => goTo("analyze")}>Go to Analyze</button>
              </div>
            )}

            {result && !result.error && (
              <div className="panel result-panel-full">
                <span className={isHighRisk ? "risk-badge high" : "risk-badge low"}>
                  {isHighRisk ? "Risk Flagged" : "No Major Risk Flag"}
                </span>

                {/* ================= OFFLINE MODE BADGE ================= */}

                {result.offline && (
                  <span className="offline-badge">Offline Estimate</span>
                )}

                {/* ================= END OFFLINE MODE BADGE ================= */}

                <h1>{result.label}</h1>

                <p className="mode-label">
                  {result.offline
                    ? "Offline Mode (Rule-based)"
                    : "Live Model Prediction"}
                </p>

                <div
                  className="score-ring"
                  style={{ "--progress": `${result.percentage}%` }}
                >
                  <div className="score-ring-content">
                    <span>{result.percentage}%</span>
                    <small>
                      {result.offline ? "offline estimate" : "model probability"}
                    </small>
                  </div>
                </div>

                <div className="result-detail-grid">
                  <div>
                    <p>Decision Threshold</p>
                    <strong>{result.threshold}</strong>
                  </div>
                  <div>
                    <p>Model Output</p>
                    <strong>
                      {result.prediction === 1 ? "Positive Flag" : "Low Flag"}
                    </strong>
                  </div>
                </div>

                <div className="guidance-box">
                  <h3>What this means</h3>
                  <p>
                    {isHighRisk
                      ? "The system has flagged this input pattern as higher risk. This does not confirm PCOD/PCOS, but professional consultation may be useful."
                      : "The system has not flagged a major risk pattern. Continue monitoring symptoms and consult a professional if concerns persist."}
                  </p>
                </div>

                {/* ================= EXPLAINABLE IMPORTANCE BARS (REMOVE IF NOT NEEDED) ================= */}

                <div className="importance-box">
                  <h3>Explainable Importance Signals</h3>
                  <p>
                    These bars show which input groups are most responsible for
                    the current risk pattern.
                  </p>

                  {importanceBars.map((bar) => (
                    <div className="importance-item" key={bar.label}>
                      <div className="importance-label">
                        <span>{bar.label}</span>
                        <strong>{bar.value}/100</strong>
                      </div>

                      <div className="importance-track">
                        <div
                          className="importance-fill"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ================= END EXPLAINABLE IMPORTANCE BARS ================= */}

                {/* ================= SMART HIGHLIGHTS (REMOVE IF NOT NEEDED) ================= */}

                <div className="highlight-box">
                  <h3>Smart Highlights</h3>
                  {smartHighlights.map((item) => (
                    <div className="highlight-item" key={item.title}>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  ))}
                </div>

                {/* ================= END SMART HIGHLIGHTS ================= */}

                <div className="ai-box">
                  <h3>AI Insight</h3>

                  {aiInsight ? (
                    <p>{aiInsight}</p>
                  ) : (
                    <p className="muted">
                      Generate a simple AI explanation of this result.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateInsight}
                    disabled={aiLoading}
                  >
                    {aiLoading ? "Generating..." : "Generate AI Insight"}
                  </button>
                </div>

                <div className="disclaimer">
                  This is an educational awareness tool, not a medical diagnosis
                  or treatment recommendation.
                </div>

                <div className="result-actions">
                  <button type="button" onClick={() => downloadPDF()}>
                    Print / Download Report
                  </button>
                  <button type="button" onClick={() => goTo("analyze")}>
                    New Analysis
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {page === "history" && (
          <section className="history-section">
            <div className="section-heading">
              <span>H</span>
              <div>
                <h2>Report History</h2>
                <p>Saved prediction reports from this browser</p>
              </div>
            </div>

            {history.length > 0 && (
              <button type="button" onClick={clearHistory}>
                Clear History
              </button>
            )}

            {history.length === 0 ? (
              <div className="empty-history">
                No saved reports yet. Run an analysis to create one.
              </div>
            ) : (
              <>
                <div className="panel">
                  <h3>Risk Trend</h3>

                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#b34d7c"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="history-grid">
                  {history.map((item) => (
                    <div className="history-card" key={item.id}>
                      <p className="history-date">{item.date}</p>
                      <h3>{item.result.percentage}%</h3>
                      <p>{item.result.label}</p>

                      <span
                        className={
                          item.result.prediction === 1
                            ? "risk-badge high"
                            : "risk-badge low"
                        }
                      >
                        {item.result.prediction === 1
                          ? "Risk Flagged"
                          : "No Major Risk Flag"}
                      </span>

                      {item.result.offline && (
                        <span className="offline-badge">Offline</span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          downloadPDF(
                            item.result,
                            item.inputs,
                            "",
                            item.highlights || getSmartHighlights(item.inputs),
                            item.importanceBars || getImportanceBars(item.inputs)
                          )
                        }
                      >
                        Print Report
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;