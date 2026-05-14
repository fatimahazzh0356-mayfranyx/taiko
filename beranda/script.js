document.addEventListener('DOMContentLoaded', async () => {
  try {
    const dashboardData = await loadDashboardData();

    console.log('Dashboard Data:', dashboardData);

    createUserInfoCard();
    createDashboardNotification();

    updateSummaryCards(dashboardData);

    createHealthyCard(dashboardData.healthyProbability);

    createRecommendationCard();

    safeRun(
      () => createFactorChart(dashboardData.factors),
      'Statistik Faktor'
    );

    safeRun(
      () => createDistributionChart(dashboardData.distribution),
      'Distribusi Kategori'
    );

    safeRun(
      () => createTopBottomChart(dashboardData.topBottom),
      'Top Bottom UMKM'
    );

    safeRun(
      () => createBoxplotChart(dashboardData.boxplot),
      'Boxplot'
    );

  } catch (error) {
    console.error('Error dashboard:', error);
    showErrorState(error.message);
  }
});

async function loadDashboardData() {
  try {
    const response = await fetch('../data/data_umkm.json');

    if (!response.ok) {
      throw new Error('Gagal memuat data_umkm.json');
    }

    const jsonData = await response.json();

    console.log('Data JSON berhasil dimuat:', jsonData);

    const assessments =
      JSON.parse(localStorage.getItem('assessments')) || [];

    const combinedData = convertJsonToDashboardFormat(
      jsonData,
      assessments
    );

    return combinedData;

  } catch (error) {
    console.error('Error loadDashboardData:', error);
    throw error;
  }
}

function convertJsonToDashboardFormat(jsonData, assessments) {
  const allUmkm = [...jsonData];

  const groupedAssessments = groupAssessmentsByUmkm(assessments);

  groupedAssessments.forEach(group => {
    const combinedUmkm = combineAssessmentGroup(group);
    if (combinedUmkm) {
      allUmkm.push(combinedUmkm);
    }
  });

  const factors = [
    {
      name: "OV",
      values: allUmkm.map(x => Number(x.organizational_values || 0))
    },
    {
      name: "LDI",
      values: allUmkm.map(x => Number(x.leader_involvement || 0))
    },
    {
      name: "INS",
      values: allUmkm.map(x => Number(x.institutional_resources || 0))
    },
    {
      name: "OPS",
      values: allUmkm.map(x => Number(x.operational_stability || 0))
    },
    {
      name: "WEQ",
      values: allUmkm.map(x => Number(x.work_environment_quality || 0))
    },
    {
      name: "ECT",
      values: allUmkm.map(x => Number(x.economics_performance || 0))
    }
  ];

  const factorSummary = factors.map((factor) => {
    const values = factor.values.filter(v => v > 0);

    return {
      name: factor.name,
      mean: average(values),
      stdDev: calculateStdDev(values),
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0
    };
  });

  const distribution = [
    {
      category: "Buruk",
      count: allUmkm.filter(x =>
        calculateOverallScore(x) < 2.1
      ).length
    },
    {
      category: "Cukup",
      count: allUmkm.filter(x => {
        const score = calculateOverallScore(x);
        return score >= 2.1 && score < 3.1;
      }).length
    },
    {
      category: "Baik",
      count: allUmkm.filter(x => {
        const score = calculateOverallScore(x);
        return score >= 3.1 && score < 4.1;
      }).length
    },
    {
      category: "Sangat Baik",
      count: allUmkm.filter(x =>
        calculateOverallScore(x) >= 4.1
      ).length
    }
  ];

  const sortedUmkm = [...allUmkm]
    .map(item => ({
      id: item.id_umkm,
      score: calculateOverallScore(item)
    }))
    .sort((a, b) => b.score - a.score);

  const topBottom = {
    top3: sortedUmkm.slice(0, 3),
    bottom3: sortedUmkm.slice(-3).reverse()
  };

  const boxplot = factors.map((factor) => ({
    label: factor.name,
    items: factor.values.filter(v => v > 0)
  }));

  const healthyCount =
    distribution.find(x => x.category === "Baik")?.count || 0;

  const totalCount = allUmkm.length;

  return {
    factors: factorSummary,
    distribution,
    topBottom,
    boxplot,
    healthyProbability: {
      percentage: totalCount ? (healthyCount / totalCount) * 100 : 0,
      healthyCount,
      totalCount
    }
  };
}

function groupAssessmentsByUmkm(assessments) {
  const groups = {};

  assessments.forEach(item => {
    const key =
      item.umkm_id ||
      normalizeText(item.nama_umkm);

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(item);
  });

  return Object.values(groups);
}

function combineAssessmentGroup(group) {
  if (!group.length) return null;

  const first = group[0];

  const getFactorAverage = (factor) => {
    const values = group
      .map(item => Number(item.factor_scores?.[factor]))
      .filter(value => !isNaN(value) && value > 0);

    return values.length ? average(values) : 0;
  };

  return {
    id_umkm: first.umkm_id || first.id_umkm || normalizeText(first.nama_umkm),
    nama_umkm: first.nama_umkm || "UMKM Baru",
    sektor: first.sektor || "Sektor belum tersedia",

    organizational_values: getFactorAverage("OV"),
    leader_involvement: getFactorAverage("LDI"),
    institutional_resources: getFactorAverage("INS"),
    operational_stability: getFactorAverage("OPS"),
    work_environment_quality: getFactorAverage("WEQ"),
    economics_performance: getFactorAverage("ECT")
  };
}

function calculateOverallScore(item) {
  const scores = [
    item.organizational_values,
    item.leader_involvement,
    item.institutional_resources,
    item.operational_stability,
    item.work_environment_quality,
    item.economics_performance
  ]
  .map(Number)
  .filter(v => v > 0);

  return average(scores);
}

function calculateStdDev(values) {
  if (!values.length) return 0;

  const avg = average(values);

  const squareDiffs = values.map(value =>
    Math.pow(value - avg, 2)
  );

  return Math.sqrt(
    average(squareDiffs)
  );
}

function safeRun(callback, chartName) {
  try {
    callback();
  } catch (error) {
    console.error(`Gagal membuat chart ${chartName}:`, error);
  }
}

function showErrorState(message) {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div style="margin:16px; padding:12px 16px; background:#fdeaea; color:#c94b4b; border-radius:10px;">
      ${message}
    </div>`
  );
}

function createUserInfoCard() {
  const container = document.getElementById('userInfoCard');
  if (!container) return;

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const activeUser = JSON.parse(localStorage.getItem('activeUser'));

  if (!isLoggedIn || !activeUser) {
    container.innerHTML = '';
    return;
  }

  const roleLabel = activeUser.role === 'owner'
    ? 'Owner / Pemilik UMKM'
    : 'Karyawan / Tim UMKM';

  container.innerHTML = `
    <div class="user-info-card">
      <div>
        <span class="user-greeting">Selamat datang,</span>
        <h3>${activeUser.name}</h3>
        <p>
          UMKM: <b>${activeUser.umkm.nama_umkm}</b> · 
          Sektor: <b>${activeUser.umkm.sektor}</b> · 
          Role: <b>${roleLabel}</b>
        </p>
      </div>

      <button class="logout-btn" onclick="logoutUser()">Logout</button>
    </div>
  `;
}

function logoutUser() {
  localStorage.setItem('isLoggedIn', 'false');
  localStorage.removeItem('activeUser');
  window.location.href = '../landing_page/landing.html';
}

function createDashboardNotification() {
  const notification = document.getElementById("dashboardNotification");
  if (!notification) return;

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const activeUser = JSON.parse(localStorage.getItem("activeUser"));
  const assessments = JSON.parse(localStorage.getItem("assessments")) || [];

  if (!isLoggedIn || !activeUser) {
    notification.innerHTML = `
      <div class="notif notif-warning">
        <div>
          <h3>Login untuk Mengisi Kuesioner</h3>
          <p>
            Anda dapat melihat ringkasan dashboard, tetapi perlu login terlebih dahulu
            untuk mengisi kuesioner dan melihat hasil organisasi Anda.
          </p>
        </div>
        <a href="../login/login.html" class="notif-btn">Login Sekarang</a>
      </div>
    `;
    return;
  }

  const activeUmkmId = activeUser.umkm_id || activeUser.umkm?.umkm_id;
  const activeUmkmName = normalizeText(activeUser.umkm?.nama_umkm);

  const sameUmkmAssessments = assessments.filter(item => {
    const itemUmkmId = item.umkm_id;
    const itemUmkmName = normalizeText(item.nama_umkm);

    return itemUmkmId == activeUmkmId || itemUmkmName === activeUmkmName;
  });

  const hasOwnerAssessment = sameUmkmAssessments.some(item =>
    item.user_role === "owner"
  );

  const hasEmployeeAssessment = sameUmkmAssessments.some(item =>
    item.user_role === "karyawan" || item.user_role === "employee"
  );

  const currentUserHasSubmitted = sameUmkmAssessments.some(item =>
    item.user_id == activeUser.user_id
  );

  const isOwner = activeUser.role === "owner";

  if (!currentUserHasSubmitted) {
    notification.innerHTML = `
      <div class="notif notif-success">
        <div>
          <h3>Lengkapi Kuesioner ${isOwner ? "Owner" : "Karyawan"}</h3>
          <p>
            Halo <b>${activeUser.name}</b>, Anda belum mengisi kuesioner untuk UMKM
            <b>${activeUser.umkm.nama_umkm}</b>. Silakan isi kuesioner sesuai role Anda
            agar hasil analisis organisasi dapat dihitung.
          </p>
        </div>
        <a href="../kuisioner/kuisioner.html" class="notif-btn">
          Isi Kuesioner
        </a>
      </div>
    `;
    return;
  }

  if (!hasOwnerAssessment && hasEmployeeAssessment) {
    notification.innerHTML = `
      <div class="notif notif-warning">
        <div>
          <h3>Menunggu Kuesioner Owner</h3>
          <p>
            Kuesioner karyawan sudah tersimpan. Hasil akhir akan muncul setelah
            owner UMKM <b>${activeUser.umkm.nama_umkm}</b> login dan mengisi
            kuesioner owner.
          </p>
        </div>
        <a href="../profil/profil.html" class="notif-btn">
          Lihat Profil UMKM
        </a>
      </div>
    `;
    return;
  }

  if (hasOwnerAssessment && !hasEmployeeAssessment) {
    notification.innerHTML = `
      <div class="notif notif-warning">
        <div>
          <h3>Menunggu Kuesioner Karyawan</h3>
          <p>
            Kuesioner owner sudah tersimpan. Hasil akhir akan muncul setelah minimal
            satu karyawan UMKM <b>${activeUser.umkm.nama_umkm}</b> login dan mengisi
            kuesioner karyawan.
          </p>
        </div>
        <a href="../profil/profil.html" class="notif-btn">
          Lihat Profil UMKM
        </a>
      </div>
    `;
    return;
  }

  if (hasOwnerAssessment && hasEmployeeAssessment) {
    notification.innerHTML = `
      <div class="notif notif-success">
        <div>
          <h3>Assessment Sudah Lengkap</h3>
          <p>
            Data kuesioner owner dan karyawan untuk UMKM
            <b>${activeUser.umkm.nama_umkm}</b> sudah lengkap.
            Anda dapat melihat hasil analisis akhir.
          </p>
        </div>
        <a href="../detail/detail_analisis.html" class="notif-btn" onclick="localStorage.removeItem('selectedUmkm'); localStorage.removeItem('previewAssessments');">
          Lihat Detail Analisis
        </a>
      </div>
    `;
  }
}

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function updateSummaryCards(data) {
  const statCards = document.querySelectorAll('.stat-card');
  const factors = Array.isArray(data.factors) ? data.factors : [];

  if (!factors.length) return;

  const meanScore = average(factors.map((f) => f.mean));
  const meanStdDev = average(factors.map((f) => f.stdDev));
  const minScore = Math.min(...factors.map((f) => Number(f.min)));
  const maxScore = Math.max(...factors.map((f) => Number(f.max)));

  const values = [meanScore, meanStdDev, minScore, maxScore];

  statCards.forEach((card, i) => {
    const h3 = card.querySelector('h3');
    if (h3 && values[i] !== undefined) {
      h3.textContent = formatNumber(values[i]);
    }
  });
}

function createHealthyCard(data) {
  const card = document.getElementById('healthyCard');
  if (!card) return;

  const healthyData = data || {
    percentage: 2.34,
    healthyCount: 10,
    totalCount: 428
  };

  card.innerHTML = `
    <div class="healthy-card">
      <div class="title">Probabilitas UMKM Sehat</div>
      <div class="value">${formatPercent(healthyData.percentage)}</div>
      <div class="desc">
        ${healthyData.healthyCount} dari ${healthyData.totalCount} UMKM termasuk kategori sehat.
      </div>
      <p class="insight" style="margin-bottom:0;">
        Hanya sebagian kecil UMKM yang termasuk kategori sehat dibandingkan keseluruhan data.
      </p>
    </div>
  `;
}

function createRecommendationCard() {
  const card = document.getElementById('recommendationCard');
  if (!card) return;

  card.innerHTML = `
    <div class="recommendation-card">
      <div class="title">Rekomendasi Perbaikan</div>

      <div class="desc" style="margin-top:10px; font-size:14px; color:#5c6d74; line-height:1.6;">
        <p><b>Perkuat Kepemimpinan</b><br>
        Tingkatkan kemampuan leadership untuk pengambilan keputusan yang lebih efektif.</p>

        <p><b>Optimalkan Sumber Daya</b><br>
        Gunakan tenaga kerja dan fasilitas secara lebih efisien.</p>

        <p><b>Perbaiki Operasional</b><br>
        Buat sistem kerja lebih stabil dan terstruktur.</p>

        <p><b>Tingkatkan Kinerja Ekonomi</b><br>
        Fokus pada peningkatan hasil usaha dan profitabilitas.</p>
      </div>
    </div>
  `;
}

function createFactorChart(factors) {
  const ctx = document.getElementById('factorChart');
  if (!ctx || !Array.isArray(factors) || !factors.length) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: factors.map((f) => f.name),
      datasets: [{
        label: 'Rata-rata Faktor',
        data: factors.map((f) => Number(f.mean)),
        backgroundColor: factors.map((f) => f.name === 'WEQ' ? '#1f8a70' : '#8fd3c1'),
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
            label: function(context) {
              const factor = factors[context.dataIndex];
              return [
                `Mean: ${formatNumber(factor.mean)}`,
                `Std. Deviasi: ${formatNumber(factor.stdDev)}`,
                `Minimum: ${formatNumber(factor.min)}`,
                `Maksimum: ${formatNumber(factor.max)}`
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          suggestedMax: 5
        }
      }
    }
  });
}

function createDistributionChart(distribution) {
  const ctx = document.getElementById('distributionChart');
  if (!ctx || !Array.isArray(distribution) || !distribution.length) return;

  const values = distribution.map((d) => Number(d.count));

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: distribution.map((d) => d.category),
      datasets: [{
        data: values,
        backgroundColor: ['#ef5350', '#f9c74f', '#1f8a70', '#89d8c3'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            color: '#5c6d74',
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = values.reduce((a, b) => a + b, 0);
              const val = Number(context.raw);
              const pct = total ? ((val / total) * 100).toFixed(2) : 0;
              return `${context.label}: ${val} UMKM (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function createTopBottomChart(topBottom) {
  const ctx = document.getElementById('topBottomChart');
  if (!ctx || !topBottom) return;

  const top3 = Array.isArray(topBottom.top3) ? topBottom.top3 : [];
  const bottom3 = Array.isArray(topBottom.bottom3) ? topBottom.bottom3 : [];

  if (!top3.length && !bottom3.length) return;

  const labels = [
    ...top3.map((x) => `Top ${x.id}`),
    ...bottom3.map((x) => `Bottom ${x.id}`)
  ];

  const values = [
    ...top3.map((x) => Number(x.score)),
    ...bottom3.map((x) => Number(x.score))
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#1f8a70', '#2fa98a', '#63c5ad',
          '#f28b82', '#ea6b66', '#d9534f'
        ],
        borderRadius: 8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: 4
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
}

function createBoxplotChart(boxplotData) {
  const ctx = document.getElementById('boxplotChart');
  if (!ctx || !Array.isArray(boxplotData) || !boxplotData.length) return;

  if (typeof Chart === 'undefined') {
    console.error('Chart.js belum termuat.');
    return;
  }

  new Chart(ctx, {
    type: 'boxplot',
    data: {
      labels: boxplotData.map((x) => x.label),
      datasets: [{
        label: 'Sebaran Skor',
        data: boxplotData.map((x) => x.items),
        outlierBackgroundColor: 'rgba(0, 0, 0, 0.12)',
        itemBackgroundColor: 'rgba(0, 0, 0, 0.08)',
        borderColor: '#1f8a70',
        borderWidth: 2,
        outlierRadius: 2,
        itemRadius: 1,
        padding: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#5c6d74' }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 4,
          ticks: { color: '#5c6d74' },
          grid: { color: '#e8efec' }
        }
      }
    }
  });
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, n) => sum + Number(n || 0), 0) / arr.length;
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}