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
  renderRadarChart(combinedResult.factor_scores);
  renderBenchmarkBoxplot(combinedResult.factor_scores);
  renderBenchmarkInsight(combinedResult.factor_scores);
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

function renderRadarChart(factorScores) {
  const ctx = document.getElementById("radarChart");

  if (!ctx) return;

  if (window.radarChartInstance) {
    window.radarChartInstance.destroy();
  }

  const labels = [
    "OV",
    "LDI",
    "INS",
    "OPS",
    "WEQ",
    "ECT"
  ];

  const values = labels.map(label =>
    Number(factorScores[label] || 0)
  );

  window.radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Skor Faktor UMKM",
          data: values,
          fill: true,
          backgroundColor: "rgba(31, 138, 112, 0.18)",
          borderColor: "#1f8a70",
          borderWidth: 3,
          pointBackgroundColor: "#1f8a70",
          pointBorderColor: "#ffffff",
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#1f8a70",
          pointRadius: 5
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#24343a",
            font: {
              size: 14,
              weight: "700"
            }
          }
        }
      },

      scales: {
        r: {
          min: 0,
          max: 5,

          ticks: {
            stepSize: 1,
            backdropColor: "transparent",
            color: "#6b7b83"
          },

          grid: {
            color: "rgba(0,0,0,0.08)"
          },

          angleLines: {
            color: "rgba(0,0,0,0.08)"
          },

          pointLabels: {
            color: "#24343a",
            font: {
              size: 14,
              weight: "700"
            }
          }
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

function renderBenchmarkInsight(userFactorScores) {
  const insightEl = document.getElementById("benchmarkInsight");
  if (!insightEl) return;

  const entries = Object.entries(userFactorScores)
    .filter(([, score]) => Number(score) > 0);

  if (!entries.length) return;

  const highest = entries.reduce((a, b) => b[1] > a[1] ? b : a);
  const lowest = entries.reduce((a, b) => b[1] < a[1] ? b : a);

  const highestInfo = factorInfo[highest[0]];
  const lowestInfo = factorInfo[lowest[0]];

  insightEl.innerHTML = `
    <div class="insight-intro">
      <span class="insight-label">Interpretasi Boxplot</span>
      <h3>Posisi UMKM dibandingkan 428 UMKM pembanding</h3>
      <p>
        Boxplot membantu melihat apakah skor faktor UMKM berada di bawah, setara,
        atau lebih tinggi dibanding mayoritas UMKM lain. Kotak menunjukkan rentang nilai
        yang paling banyak muncul, sedangkan garis tengah menunjukkan median.
      </p>
    </div>

    <div class="insight-grid">
      <div class="insight-mini-card success">
        <small>Faktor Terkuat</small>
        <div>
          <span class="factor-code">${highest[0]}</span>
          <span class="factor-name">${highestInfo?.id || highest[0]}</span>
        </div>
        <p>
          Skor <b>${Number(highest[1]).toFixed(2)}</b>. Faktor ini menjadi kekuatan utama UMKM
          dan dapat dipertahankan sebagai modal organisasi.
        </p>
      </div>

      <div class="insight-mini-card warning">
        <small>Prioritas Perbaikan</small>
        <div>
          <span class="factor-code">${lowest[0]}</span>
          <span class="factor-name">${lowestInfo?.id || lowest[0]}</span>
        </div>
        <p>
          Skor <b>${Number(lowest[1]).toFixed(2)}</b>. Faktor ini menjadi area terendah
          dari hasil kuesioner dan perlu mendapat perhatian lebih dulu.
        </p>
      </div>
    </div>

    <div class="insight-note">
      <p>
        <b>Cara baca titik “Skor UMKM Ini”:</b>
        titik di atas kotak berarti lebih baik dari mayoritas pembanding,
        titik di dalam kotak berarti masih berada pada rentang umum,
        dan titik di bawah kotak berarti faktor tersebut perlu ditingkatkan.
      </p>
    </div>
  `;
}

function renderInsights(result) {
  const insightBox = document.getElementById("insightBox");
  const scores = result.factor_scores;

  const entries = Object.entries(scores).filter(([, score]) => score > 0);

  if (!entries.length) {
    insightBox.innerHTML = `
      <div class="analysis-action">
        Data faktor belum tersedia untuk dianalisis.
      </div>
    `;
    return;
  }

  const values = entries.map(([, score]) => Number(score));
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const gap = highest - lowest;

  const lowFactors = entries
    .filter(([, score]) => Number(score) < 3.5)
    .map(([factor]) => factor);

  const highFactors = entries
    .filter(([, score]) => Number(score) >= 4)
    .map(([factor]) => factor);

  let balanceStatus = "";
  let balanceDesc = "";
  let riskLevel = "";
  let focusText = "";
  let strategyText = "";

  if (gap <= 0.75) {
    balanceStatus = "Stabil";
    balanceDesc = "Skor antar faktor relatif merata dan tidak menunjukkan ketimpangan besar.";
  } else if (gap <= 1.5) {
    balanceStatus = "Cukup Seimbang";
    balanceDesc = "Ada perbedaan antar faktor, tetapi selisihnya masih dalam batas yang cukup wajar.";
  } else {
    balanceStatus = "Belum Seimbang";
    balanceDesc = "Selisih antar faktor cukup besar, sehingga ada area yang tertinggal dibanding faktor lainnya.";
  }

  if (lowFactors.length >= 3) {
    riskLevel = "Evaluasi Menyeluruh";
    focusText = "Beberapa faktor masih berada di bawah batas aman.";
    strategyText = "Lakukan evaluasi bertahap pada pembagian kerja, kepemimpinan, sumber daya, dan stabilitas operasional.";
  } else if (lowFactors.length >= 1) {
    riskLevel = "Fokus Terarah";
    focusText = `Faktor ${lowFactors.join(", ")} perlu menjadi perhatian utama.`;
    strategyText = "Mulai dari faktor terendah terlebih dahulu, lalu lanjutkan ke faktor pendukung lain.";
  } else {
    riskLevel = "Relatif Aman";
    focusText = "Tidak ada faktor yang berada pada level rendah.";
    strategyText = "Fokus berikutnya adalah menjaga konsistensi, efisiensi, dan inovasi organisasi.";
  }

  insightBox.innerHTML = `
    <div class="analysis-summary-card">
      <span class="analysis-label">Keseimbangan Faktor</span>
      <h3>${balanceStatus}</h3>
      <p>${balanceDesc}</p>
    </div>

    <div class="analysis-metric-grid">
      <div class="analysis-metric-card">
        <span>Selisih Skor</span>
        <strong>${gap.toFixed(2)}</strong>
        <p>Tertinggi - terendah</p>
      </div>

      <div class="analysis-metric-card">
        <span>Faktor Rendah</span>
        <strong>${lowFactors.length}</strong>
        <p>${lowFactors.length ? lowFactors.join(", ") : "Tidak ada"}</p>
      </div>

      <div class="analysis-metric-card">
        <span>Faktor Kuat</span>
        <strong>${highFactors.length}</strong>
        <p>${highFactors.length ? highFactors.join(", ") : "Belum ada"}</p>
      </div>
    </div>

    <div class="analysis-action">
      <b>Tingkat Risiko Perbaikan</b><br>
      <span class="risk-label">${riskLevel}</span><br>
      ${focusText}
    </div>

    <div class="analysis-action">
      <b>Saran Strategi</b><br>
      ${strategyText}
    </div>

<div class="analysis-action action-plan">
  <b>Prioritas Aksi 30 Hari</b>
  <ul>
    <li><span>1</span> Evaluasi faktor dengan skor terendah.</li>
    <li><span>2</span> Tentukan satu tindakan perbaikan paling realistis.</li>
    <li><span>3</span> Pantau perubahan melalui kuesioner berikutnya.</li>
  </ul>
</div>

<div class="analysis-action recommendation-cta">
  <b>Butuh Rekomendasi Perbaikan?</b>
  <p>
    Sistem telah menyiapkan saran strategi dan langkah pengembangan organisasi
    berdasarkan hasil analisis UMKM ini.
  </p>

  <a href="../saran_rekomendasi/saran_rekomendasi.html" class="recommendation-btn">
    Lihat Saran & Rekomendasi
  </a>
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