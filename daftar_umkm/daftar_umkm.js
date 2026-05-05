document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");

let savedUmkms = JSON.parse(localStorage.getItem("umkms")) || [];
let savedAssessments = JSON.parse(localStorage.getItem("assessments")) || [];

let dummyUmkms = getDummyUmkms();
let dummyAssessments = getDummyAssessments();

let umkms = [...dummyUmkms, ...savedUmkms];
let assessments = [...dummyAssessments, ...savedAssessments];

  const enrichedUmkms = umkms.map(umkm => {
    const result = calculateUmkmHealth(umkm, assessments);

    return {
      ...umkm,
      score: result.score,
      percentage: result.percentage,
      category: result.category,
      assessed: result.assessed
    };
  });

  renderSummary(enrichedUmkms);
  renderUmkmCards(enrichedUmkms);

  searchInput.addEventListener("input", () => {
    const keyword = normalizeText(searchInput.value);

    const filtered = enrichedUmkms.filter(umkm =>
      normalizeText(umkm.nama_umkm).includes(keyword) ||
      normalizeText(umkm.sektor).includes(keyword)
    );

    renderUmkmCards(filtered);
  });
});

function calculateUmkmHealth(umkm, assessments) {
  const umkmId = umkm.umkm_id;
  const umkmName = normalizeText(umkm.nama_umkm);

  const relatedAssessments = assessments.filter(item => {
    return item.umkm_id == umkmId || normalizeText(item.nama_umkm) === umkmName;
  });

  if (!relatedAssessments.length) {
    return {
      score: 0,
      percentage: 0,
      category: "Belum Dinilai",
      assessed: false
    };
  }

  const scores = relatedAssessments
    .map(item => Number(item.total_average_score))
    .filter(score => !isNaN(score) && score > 0);

  const score = average(scores);
  const percentage = Math.round((score / 5) * 100);

  return {
    score,
    percentage,
    category: calculateCategory(score),
    assessed: true
  };
}

function renderSummary(umkms) {
  const assessed = umkms.filter(item => item.assessed);
  const scores = assessed.map(item => item.percentage).filter(score => score > 0);
  const avg = scores.length ? Math.round(average(scores)) : 0;

  const needAttention = umkms.filter(item =>
    item.category === "Buruk" || item.category === "Cukup"
  ).length;

  document.getElementById("totalUmkm").textContent = umkms.length;
  document.getElementById("averageScore").textContent = `${avg}%`;
  document.getElementById("needAttention").textContent = needAttention;
}

function renderUmkmCards(umkms) {
  const grid = document.getElementById("umkmGrid");

  if (!umkms.length) {
    grid.innerHTML = `
      <div class="empty-message">
        Tidak ada UMKM yang cocok dengan pencarian.
      </div>
    `;
    return;
  }

  grid.innerHTML = umkms.map(umkm => {
    const statusClass = umkm.assessed ? "done" : "empty";
    const statusText = umkm.assessed ? "SUDAH DINILAI" : "BELUM DINILAI";
    const encodedUmkm = encodeURIComponent(JSON.stringify(umkm));

    return `
      <article class="umkm-card" onclick="openUmkmDetail('${encodedUmkm}')">
        <div class="card-top">
          <div class="umkm-icon">${getInitial(umkm.nama_umkm)}</div>
          <span class="status ${statusClass}">${statusText}</span>
        </div>

        <h3>${umkm.nama_umkm}</h3>
        <span class="sector">${umkm.sektor}</span>

        <div class="score-row">
          <strong>Kesehatan Organisasi</strong>
          <strong>${umkm.percentage}%</strong>
        </div>

        <div class="progress">
          <div class="progress-fill" style="width:${umkm.percentage}%"></div>
        </div>

        <div class="category">
          Kategori: <b>${umkm.category}</b>
        </div>
      </article>
    `;
  }).join("");
}

function openUmkmDetail(encodedUmkm) {
  const umkm = JSON.parse(decodeURIComponent(encodedUmkm));

  localStorage.setItem("selectedUmkm", JSON.stringify(umkm));
  window.location.href = "../detail/detail_analisis.html";
}

function getDummyUmkms() {
  return [
    { umkm_id: "dummy-1", nama_umkm: "Bakery Kencana", sektor: "Kuliner" },
    { umkm_id: "dummy-2", nama_umkm: "Batik Luhur", sektor: "Fashion" },
    { umkm_id: "dummy-3", nama_umkm: "Mebel Jati Jaya", sektor: "Furnitur" },
    { umkm_id: "dummy-4", nama_umkm: "Glow Skin Care", sektor: "Kecantikan" },
    { umkm_id: "dummy-5", nama_umkm: "Tani Makmur", sektor: "Pertanian" },
    { umkm_id: "dummy-6", nama_umkm: "Cepat Tech Service", sektor: "Teknologi" }
  ];
}

function getDummyAssessments() {
  return [
    {
      umkm_id: "dummy-1",
      nama_umkm: "Bakery Kencana",
      total_average_score: 3.8,
      category: "Baik",
      assessment_date: new Date().toISOString(),
      user_name: "Dummy Owner",
      user_role: "owner",
      factor_scores: {
        OV: 3.6,
        LDI: 3.7,
        INS: 3.5,
        OPS: 3.8,
        WEQ: 4.0,
        ECT: 3.9
      }
    },
    {
      umkm_id: "dummy-2",
      nama_umkm: "Batik Luhur",
      total_average_score: 2.4,
      category: "Cukup",
      assessment_date: new Date().toISOString(),
      user_name: "Dummy Owner",
      user_role: "owner",
      factor_scores: {
        OV: 2.5,
        LDI: 2.2,
        INS: 2.4,
        OPS: 2.3,
        WEQ: 2.8,
        ECT: 2.2
      }
    },
    {
      umkm_id: "dummy-3",
      nama_umkm: "Mebel Jati Jaya",
      total_average_score: 4.3,
      category: "Sangat Baik",
      assessment_date: new Date().toISOString(),
      user_name: "Dummy Owner",
      user_role: "owner",
      factor_scores: {
        OV: 4.2,
        LDI: 4.4,
        INS: 4.1,
        OPS: 4.3,
        WEQ: 4.5,
        ECT: 4.3
      }
    },
    {
      umkm_id: "dummy-4",
      nama_umkm: "Glow Skin Care",
      total_average_score: 3.1,
      category: "Baik",
      assessment_date: new Date().toISOString(),
      user_name: "Dummy Owner",
      user_role: "owner",
      factor_scores: {
        OV: 3.0,
        LDI: 3.1,
        INS: 2.9,
        OPS: 3.0,
        WEQ: 3.5,
        ECT: 3.1
      }
    }
  ];
}

function calculateCategory(score) {
  if (score >= 4.1) return "Sangat Baik";
  if (score >= 3.1) return "Baik";
  if (score >= 2.1) return "Cukup";
  if (score > 0) return "Buruk";
  return "Belum Dinilai";
}

function getInitial(name) {
  return String(name || "U").charAt(0).toUpperCase();
}

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, value) => sum + Number(value), 0) / arr.length;
}