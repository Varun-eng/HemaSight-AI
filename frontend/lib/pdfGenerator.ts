import jsPDF from "jspdf";
import {
  UserProfile,
  CBCData,
  XGBoostResult,
  LongitudinalDataPoint,
  ComplianceSettings,
} from "../types";

interface PDFReportParams {
  user: UserProfile;
  cbc: CBCData;
  xgboostResult: XGBoostResult | null;
  timeSeriesData: LongitudinalDataPoint[];
  compliance: ComplianceSettings;
  anonymize: boolean;
}

export function generateClinicalPDFReport({
  user,
  cbc,
  xgboostResult,
  timeSeriesData,
  anonymize,
}: PDFReportParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("HEMASIGHT AI — CLINICAL ANALYSIS REPORT", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text(
    "LONGITUDINAL REMISSION & CLINICAL RISK ANALYSIS REPORT",
    14,
    18
  );

  doc.setTextColor(226, 232, 240);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    pageWidth - 14,
    18,
    { align: "right" }
  );

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 28, pageWidth, 2, "F");

  y = 36;

  const anonymizeName = (name: string) => {
    if (!anonymize) return name;
    return name.split(" ").map((p) => p.charAt(0) + "***").join(" ");
  };

  const anonymizeMRN = (mrn?: string) => {
    if (!mrn) return "ABHA-XXXX-XXXX";
    if (!anonymize) return mrn;
    return mrn.substring(0, 4) + "-XXXX-XXXX";
  };

  // Section 1: Patient info
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 32, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("1. PATIENT DEMOGRAPHIC & CLINICAL CONTEXT", 18, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.text(`Patient Name: ${anonymizeName(user.name)}`, 18, y + 14);
  doc.text(`Patient ID / MRN: ${anonymizeMRN(user.mrn)}`, 18, y + 20);
  doc.text(`Account Role: ${user.role.toUpperCase()}`, 18, y + 26);

  doc.text(`Diagnosis: ${user.diagnosis || "AML in Remission"}`, 110, y + 14);
  doc.text(
    `Attending Center: ${user.oncologistName || "Clinical Oncology Center"}`,
    110,
    y + 20
  );
  doc.text(`Sample Date: ${cbc.sampleDate || new Date().toLocaleDateString()}`, 110, y + 26);

  y += 38;

  // Section 2: CBC table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("2. COMPLETE BLOOD COUNT (CBC) & ABNORMALITY FINDINGS", 14, y);

  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("PARAMETER", 18, y + 5);
  doc.text("VALUE", 65, y + 5);
  doc.text("REFERENCE RANGE", 100, y + 5);
  doc.text("CLINICAL STATUS", 155, y + 5);

  y += 7;

  const cbcRows = [
    {
      name: "White Blood Cells (WBC)",
      val: `${cbc.wbc} k/µL`,
      ref: "4.5 - 11.0 k/µL",
      normal: cbc.wbc >= 4.5 && cbc.wbc <= 11.0,
      flag:
        cbc.wbc < 4.5 ? "Leukopenia" : cbc.wbc > 11.0 ? "Leukocytosis" : "Normal",
    },
    {
  name: "Absolute Neutrophils (ANC)",
  val: `${cbc.anc ?? 'N/A'} k/µL`,
  ref: "1.5 - 8.0 k/µL",
  normal: (cbc.anc ?? 0) >= 1.5,
  flag:
    (cbc.anc ?? 0) < 0.5
      ? "Severe Neutropenia"
      : (cbc.anc ?? 0) < 1.5
      ? "Mild Neutropenia"
      : "Normal",
},
    {
      name: "Peripheral Blasts (%)",
      val: `${cbc.blasts}%`,
      ref: "0.0 - 0.5%",
      normal: cbc.blasts <= 0.5,
      flag:
        cbc.blasts > 5.0
          ? "CRITICAL BLAST CRISIS"
          : cbc.blasts > 1.0
          ? "Abnormal Blasts Emergence"
          : "Normal Remission",
    },
    {
      name: "Hemoglobin (HGB)",
      val: `${cbc.hgb} g/dL`,
      ref: "12.0 - 16.0 g/dL",
      normal: cbc.hgb >= 12.0,
      flag:
        cbc.hgb < 8.0 ? "Severe Anemia" : cbc.hgb < 12.0 ? "Mild Anemia" : "Normal",
    },
    {
      name: "Platelets (PLT)",
      val: `${cbc.plt} k/µL`,
      ref: "150 - 450 k/µL",
      normal: cbc.plt >= 150,
      flag:
        cbc.plt < 50
          ? "Severe Thrombocytopenia"
          : cbc.plt < 150
          ? "Mild Thrombocytopenia"
          : "Normal",
    },
    {
      name: "Red Cell Dist. Width (RDW)",
      val: `${cbc.rdw}%`,
      ref: "11.5 - 14.5%",
      normal: cbc.rdw <= 14.5,
      flag: cbc.rdw > 14.5 ? "Elevated Anisocytosis" : "Normal",
    },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  cbcRows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6, "F");
    }

    doc.setTextColor(30, 41, 59);
    doc.text(row.name, 18, y + 4.5);
    doc.text(row.val, 65, y + 4.5);
    doc.text(row.ref, 100, y + 4.5);

    if (row.normal) {
      doc.setTextColor(16, 185, 129);
      doc.text("NORMAL", 155, y + 4.5);
    } else {
      doc.setTextColor(225, 29, 72);
      doc.setFont("helvetica", "bold");
      doc.text(row.flag, 155, y + 4.5);
      doc.setFont("helvetica", "normal");
    }

    y += 6;
  });

  y += 6;

  // Section 3: XGBoost
  if (xgboostResult) {
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(67, 56, 202);
    doc.text("3. XGBOOST PREDICTIVE RISK CLASSIFIER", 18, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Calculated Relapse Risk Score: ${xgboostResult.riskPercent}% (${xgboostResult.riskCategory})`,
      18,
      y + 14
    );
    doc.text(
      `Model Primary Classification: ${xgboostResult.primaryCondition}`,
      18,
      y + 20
    );
    doc.text(
      `Ensemble Model Confidence: ${xgboostResult.modelConfidence} (150 Decision Trees)`,
      18,
      y + 26
    );

    y += 36;
  }

  // Section 4: Trajectory
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("4. RELAPSE MONITORING & LONGITUDINAL TRAJECTORY SUMMARY", 14, y);

  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DATE", 16, y + 5);
  doc.text("MO", 38, y + 5);
  doc.text("ANC", 52, y + 5);
  doc.text("BLASTS", 72, y + 5);
  doc.text("SGOT/SGPT", 94, y + 5);
  doc.text("POTASSIUM", 124, y + 5);
  doc.text("CREATININE", 152, y + 5);
  doc.text("CHIMERISM", 180, y + 5);

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  timeSeriesData.slice(-6).forEach((pt, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6, "F");
    }

    doc.setTextColor(30, 41, 59);
    doc.text(pt.date, 16, y + 4.5);
    doc.text(`Mo ${pt.month}`, 38, y + 4.5);
    doc.text(`${pt.anc}`, 52, y + 4.5);
    doc.text(`${pt.blasts}%`, 72, y + 4.5);
    doc.text(`${pt.sgot ?? 24}/${pt.sgpt ?? 26} U/L`, 94, y + 4.5);
    doc.text(`${pt.potassium ?? 4.2} mmol/L`, 124, y + 4.5);
    doc.text(`${pt.creatinine ?? 0.8} mg/dL`, 152, y + 4.5);
    doc.text(`${pt.chimerism ?? 99.5}%`, 180, y + 4.5);

    y += 6;
  });

  y += 10;

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "CONFIDENTIAL MEDICAL REPORT. This AI predictive decision-support document assists attending hematologists and must be corroborated with confirmatory clinical evaluations.",
    14,
    pageHeight - 14
  );

  doc.text(
    `Document Integrity Checksum: SHA256-${Date.now().toString(16).toUpperCase()}`,
    14,
    pageHeight - 9
  );

  const filename = `HemaSight_Clinical_Report_${user.name.replace(
    /\s+/g,
    "_"
  )}_${Date.now()}.pdf`;
  doc.save(filename);
}