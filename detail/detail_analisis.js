const factorInfo = {
  OV: {
    full: "Organizational Values",
    id: "Nilai Organisasi"
  },
  LDI: {
    full: "Leadership",
    id: "Kepemimpinan"
  },
  INS: {
    full: "Infrastructure",
    id: "Sumber Daya"
  },
  OPS: {
    full: "Operational Stability",
    id: "Stabilitas Operasional"
  },
  WEQ: {
    full: "Work Environment Quality",
    id: "Kualitas Lingkungan Kerja"
  },
  ECT: {
    full: "Economic Performance",
    id: "Kinerja Ekonomi"
  }
};

const benchmarkBoxplotData = {
  OV: { min: 1, q1: 1, median: 2, q3: 2, max: 4, mean: 1.9 },
  LDI: { min: 1, q1: 1, median: 2, q3: 2, max: 4, mean: 1.8 },
  INS: { min: 1, q1: 1, median: 2, q3: 2, max: 4, mean: 1.6 },
  OPS: { min: 1, q1: 2, median: 2.2, q3: 3, max: 4, mean: 2.4 },
  WEQ: { min: 1.2, q1: 2.8, median: 3.3, q3: 4, max: 5, mean: 3.3 },
  ECT: { min: 1, q1: 1.3, median: 1.8, q3: 2, max: 4, mean: 1.8 }
};

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const activeUser = JSON.parse(localStorage.getItem("activeUser"));
  const selectedUmkm = JSON.parse(localStorage.getItem("selectedUmkm"));

  if (!isLoggedIn || !activeUser) {
    alert("Silakan login terlebih dahulu untuk melihat detail analisis.");
    window.location.href = "/login/login.html";
    return;
  }

  let assessments = JSON.parse(localStorage.getItem("assessments")) || [];
  const previewAssessments = JSON.parse(localStorage.getItem("previewAssessments")) || [];

  if (selectedUmkm && previewAssessments.length) {
    assessments = previewAssessments;
  }

  const targetUmkm = selectedUmkm || activeUser.umkm;

  const targetUmkmId = targetUmkm.umkm_id;
  const targetUmkmName = normalizeText(targetUmkm.nama_umkm);

  const sameUmkmAssessments = assessments.filter(item => {
    const itemUmkmId = item.umkm_id;
    const itemUmkmName = normalizeText(item.nama_umkm);

    return itemUmkmId == targetUmkmId || itemUmkmName === targetUmkmName;
  });

  const hasOwnerAssessment = sameUmkmAssessments.some(
    item => item.user_role === "owner"
  );

  const hasEmployeeAssessment = sameUmkmAssessments.some(
    item => item.user_role === "karyawan" || item.user_role === "employee"
  );

  document.getElementById("umkmInfo").textContent =
    `${targetUmkm.nama_umkm} · ${targetUmkm.sektor || "Sektor belum tersedia"}`;

  if (!sameUmkmAssessments.length) {
    document.getElementById("analysisContent").style.display = "none";
    document.getElementById("emptyState").style.display = "block";

    const emptyState = document.getElementById("emptyState");

    if (selectedUmkm) {
      emptyState.innerHTML = `
        <h2>Belum Ada Hasil Assessment</h2>
        <p>
          UMKM <b>${targetUmkm.nama_umkm}</b> belum memiliki data kuesioner,
          sehingga detail analisis belum dapat ditampilkan.
        </p>
        <a href="../daftar_umkm/daftar_umkm.html">
          Kembali ke Daftar UMKM
        </a>
      `;
    }

    return;
  }

  if (!hasOwnerAssessment || !hasEmployeeAssessment) {
    document.getElementById("analysisContent").style.display = "none";
    document.getElementById("emptyState").style.display = "block";

    const emptyState = document.getElementById("emptyState");

    if (!hasOwnerAssessment && !hasEmployeeAssessment) {
      emptyState.innerHTML = `
        <h2>Assessment Belum Lengkap</h2>
        <p>
          Owner dan karyawan belum mengisi kuesioner.
          Hasil analisis organisasi belum dapat ditampilkan.
        </p>
        <a href="../kuisioner/kuisioner.html">
          Isi Kuesioner
        </a>
      `;
    } else if (!hasOwnerAssessment) {
      emptyState.innerHTML = `
        <h2>Owner Belum Mengisi</h2>
        <p>
          Kuesioner owner belum diisi.
          Hasil analisis akhir akan muncul setelah owner mengisi assessment.
        </p>
        <a href="../kuisioner/kuisioner.html">
          Isi Kuesioner Owner
        </a>
      `;
    } else if (!hasEmployeeAssessment) {
      emptyState.innerHTML = `
        <h2>Karyawan Belum Mengisi</h2>
        <p>
          Kuesioner karyawan belum diisi.
          Hasil analisis akhir akan muncul setelah minimal satu karyawan mengisi assessment.
        </p>
        <a href="../kuisioner/kuisioner.html">
          Isi Kuesioner Karyawan
        </a>
      `;
    }

    return;
  }

  const combinedResult = calculateCombinedResult(sameUmkmAssessments);

  renderSummary(combinedResult, sameUmkmAssessments);
  renderFactorChart(combinedResult.factor_scores);
  renderBenchmarkBoxplot(combinedResult.factor_scores);
  renderInsights(combinedResult);
  renderAssessmentTable(sameUmkmAssessments);
});

function calculateCombinedResult(assessments) {
  const factors = ["OV", "LDI", "INS", "OPS", "WEQ", "ECT"];
  const factorScores = {};

  factors.forEach(factor => {
    const values = assessments
      .map(item => Number(item.factor_scores?.[factor]))
      .filter(value => !isNaN(value) && value > 0);

    factorScores[factor] = average(values);
  });

  const validScores = Object.values(factorScores).filter(score => score > 0);
  const totalAverage = average(validScores);
  const category = calculateCategory(totalAverage);

  return {
    factor_scores: factorScores,
    total_average_score: totalAverage,
    category
  };
}

function renderSummary(result, assessments) {
  document.getElementById("respondentCount").textContent = assessments.length;
  document.getElementById("averageScore").textContent = result.total_average_score.toFixed(2);
  document.getElementById("categoryResult").textContent = result.category;
}

function renderFactorChart(factorScores) {
  const ctx = document.getElementById("factorResultChart");
  if (!ctx) return;

  const labels = Object.keys(factorScores);
  const values = Object.values(factorScores);
  const validValues = values.filter(value => value > 0);

  const maxScore = Math.max(...validValues);
  const minScore = Math.min(...validValues);

  const colors = values.map(value => {
    if (value === maxScore) return "#1f8a70";
    if (value === minScore) return "#d9534f";
    return "#8fd3c1";
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Skor Faktor",
        data: values,
        backgroundColor: colors,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(context) {
              const key = context[0].label;
              const info = factorInfo[key];
              return info ? `${key} - ${info.full}` : key;
            },
            label: function(context) {
              const key = context.label;
              const info = factorInfo[key];

              return [
                `Arti: ${info ? info.id : key}`,
                `Skor: ${Number(context.raw).toFixed(2)}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 5
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderBenchmarkBoxplot(userFactorScores) {
  const ctx = document.getElementById("factorBoxplotChart");
  if (!ctx) return;

  const labels = Object.keys(benchmarkBoxplotData);

  const boxplotValues = labels.map(key => {
    const data = benchmarkBoxplotData[key];

    return {
      min: data.min,
      q1: data.q1,
      median: data.median,
      q3: data.q3,
      max: data.max,
      mean: data.mean
    };
  });

  new Chart(ctx, {
    type: "boxplot",
    data: {
      labels,
      datasets: [
        {
          label: "Distribusi 428 UMKM",
          data: boxplotValues,
          backgroundColor: "rgba(143, 211, 193, 0.45)",
          borderColor: "#1f8a70",
          borderWidth: 1.5,
          outlierColor: "#d9534f",
          itemRadius: 3
        },
        {
          type: "scatter",
          label: "Skor UMKM Ini",
          data: labels.map(key => ({
            x: key,
            y: Number(userFactorScores[key] || 0)
          })),
          backgroundColor: "#0b4f45",
          borderColor: "#0b4f45",
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              const key = context[0].label;
              const info = factorInfo[key];

              return info ? `${key} - ${info.full}` : key;
            },
            label: function(context) {
              if (context.dataset.type === "scatter") {
                return `Skor UMKM Ini: ${Number(context.raw.y).toFixed(2)}`;
              }

              const value = context.raw;

              return [
                `Min: ${value.min}`,
                `Q1: ${value.q1}`,
                `Median: ${value.median}`,
                `Q3: ${value.q3}`,
                `Max: ${value.max}`,
                `Mean: ${value.mean}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 5
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderInsights(result) {
  const insightBox = document.getElementById("insightBox");
  const scores = result.factor_scores;

  const entries = Object.entries(scores).filter(([, score]) => score > 0);

  if (!entries.length) {
    insightBox.innerHTML = `
      <div class="insight-item">
        Data faktor belum tersedia untuk dianalisis.
      </div>
    `;
    return;
  }

  const strongest = entries.reduce((a, b) => b[1] > a[1] ? b : a);
  const weakest = entries.reduce((a, b) => b[1] < a[1] ? b : a);

  insightBox.innerHTML = `
    <div class="insight-item">
      Skor gabungan organisasi berada pada kategori <b>${result.category}</b> dengan rata-rata
      <b>${result.total_average_score.toFixed(2)}</b>.
    </div>

    <div class="insight-item">
      Faktor terkuat adalah <b>${strongest[0]}</b> dengan skor <b>${strongest[1].toFixed(2)}</b>.
      Faktor ini dapat menjadi modal utama dalam pengembangan organisasi.
    </div>

    <div class="insight-item">
      Faktor yang paling perlu diperhatikan adalah <b>${weakest[0]}</b> dengan skor
      <b>${weakest[1].toFixed(2)}</b>. Area ini dapat menjadi prioritas perbaikan.
    </div>
  `;
}

function renderAssessmentTable(assessments) {
  const table = document.getElementById("assessmentTable");

  table.innerHTML = assessments.map(item => {
    const date = item.assessment_date
      ? new Date(item.assessment_date).toLocaleDateString("id-ID")
      : "-";

    const role = item.user_role === "owner" ? "Owner" : "Karyawan";
    const score = Number(item.total_average_score || 0).toFixed(2);
    const category = item.category || calculateCategory(Number(item.total_average_score || 0));

    return `
      <tr>
        <td>${item.user_name || "User"}</td>
        <td><span class="badge">${role}</span></td>
        <td>${date}</td>
        <td>${score}</td>
        <td>${category}</td>
      </tr>
    `;
  }).join("");
}

function calculateCategory(score) {
  if (score >= 4.1) return "Sangat Baik";
  if (score >= 3.1) return "Baik";
  if (score >= 2.1) return "Cukup";
  if (score > 0) return "Buruk";
  return "Belum Dinilai";
}

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function average(arr) {
  if (!arr.length) return 0;

  return arr.reduce((sum, value) =>
    sum + Number(value), 0
  ) / arr.length;
}