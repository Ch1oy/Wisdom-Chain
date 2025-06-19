document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录且是管理员
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo || userInfo.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  // 初始化页面数据
  updatePointsOverview();
  initPointsTrendChart();
  loadViolations();
  setupEventListeners();
});

// 更新积分概览
function updatePointsOverview() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  let allPoints = [];

  // 从所有活动的checkIns数组中获取积分记录
  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      activity.checkIns.forEach(checkIn => {
        allPoints.push(activity.points || 0);
      });
    }
  });

  if (allPoints.length === 0) {
    document.getElementById('totalPoints').textContent = '0';
    document.getElementById('averagePoints').textContent = '0';
    document.getElementById('maxPoints').textContent = '0';
    document.getElementById('minPoints').textContent = '0';
    return;
  }

  const total = allPoints.reduce((sum, points) => sum + points, 0);
  const average = (total / allPoints.length).toFixed(1);
  const max = Math.max(...allPoints);
  const min = Math.min(...allPoints);

  document.getElementById('totalPoints').textContent = total;
  document.getElementById('averagePoints').textContent = average;
  document.getElementById('maxPoints').textContent = max;
  document.getElementById('minPoints').textContent = min;
}

// 初始化积分趋势图
function initPointsTrendChart() {
  const ctx = document.getElementById('pointsTrendChart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: '每日积分',
        data: [],
        borderColor: '#3498db',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // 设置年月选择器的事件监听
  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');

  // 初始化年月选择器
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 生成年份选项（当前年份往前5年）
  for (let year = currentYear - 5; year <= currentYear; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year + '年';
    yearSelect.appendChild(option);
  }

  // 生成月份选项
  for (let month = 1; month <= 12; month++) {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month + '月';
    monthSelect.appendChild(option);
  }

  // 设置当前年月为默认值
  yearSelect.value = currentYear;
  monthSelect.value = currentMonth;

  // 更新图表数据
  function updateChartData() {
    const selectedYear = parseInt(yearSelect.value);
    const selectedMonth = parseInt(monthSelect.value);

    // 获取选中月份的天数
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    // 生成日期标签
    const labels = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return `${selectedMonth}月${day}日`;
    });

    // 计算每天的积分
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const dailyPoints = labels.map((_, index) => {
      const day = index + 1;
      const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let total = 0;

      activities.forEach(activity => {
        if (activity.checkIns && Array.isArray(activity.checkIns)) {
          activity.checkIns.forEach(checkIn => {
            if (checkIn.checkInTime.startsWith(date)) {
              total += activity.points || 0;
            }
          });
        }
      });

      return total;
    });

    // 更新图表数据
    chart.data.labels = labels;
    chart.data.datasets[0].data = dailyPoints;
    chart.update();
  }

  // 添加年月选择器的事件监听
  yearSelect.addEventListener('change', updateChartData);
  monthSelect.addEventListener('change', updateChartData);

  // 初始化显示当前月份的数据
  updateChartData();
}

// 加载违规记录
function loadViolations() {
  const violations = JSON.parse(localStorage.getItem('violations')) || [];
  const violationList = document.getElementById('violationList');

  if (violations.length === 0) {
    violationList.innerHTML = '<p class="no-data">暂无违规记录</p>';
    return;
  }

  violationList.innerHTML = violations.map(violation => `
    <div class="violation-card">
      <div class="violation-info">
        <h4>${violation.username}</h4>
        <p><strong>类型：</strong>${getViolationTypeText(violation.type)}</p>
        <p><strong>描述：</strong>${violation.description}</p>
        <p><strong>扣除积分：</strong>${violation.points}</p>
        <p><strong>时间：</strong>${violation.date}</p>
      </div>
      <div class="violation-actions">
        <button onclick="editViolation('${violation.id}')" class="btn-secondary">编辑</button>
        <button onclick="deleteViolation('${violation.id}')" class="btn-danger">删除</button>
      </div>
    </div>
  `).join('');
}

// 设置事件监听器
function setupEventListeners() {
  // 添加违规记录按钮
  const addViolationBtn = document.getElementById('addViolationBtn');
  if (addViolationBtn) {
    addViolationBtn.addEventListener('click', () => {
      showViolationModal();
    });
  }

  // 生成报告按钮
  const generateReportBtn = document.getElementById('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', generateReport);
  }

  // 违规表单提交
  const violationForm = document.getElementById('violationForm');
  if (violationForm) {
    violationForm.addEventListener('submit', handleViolationSubmit);
  }

  // 模态框关闭按钮
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', closeViolationModal);
  });

  // 取消按钮
  const cancelViolationBtn = document.getElementById('cancelViolationBtn');
  if (cancelViolationBtn) {
    cancelViolationBtn.addEventListener('click', closeViolationModal);
  }
}

// 显示违规记录模态框
function showViolationModal() {
  const modal = document.getElementById('violationModal');
  const userSelect = modal.querySelector('select[name="username"]');

  // 加载用户列表
  const users = JSON.parse(localStorage.getItem('users')) || {};
  userSelect.innerHTML = Object.entries(users)
    .filter(([_, user]) => user.role === 'student')
    .map(([username, user]) => `
      <option value="${username}">${user.name || username}</option>
    `).join('');

  modal.classList.add('active');
}

// 关闭违规记录模态框
function closeViolationModal() {
  document.getElementById('violationModal').classList.remove('active');
}

// 处理违规记录提交
function handleViolationSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const violations = JSON.parse(localStorage.getItem('violations')) || [];

  const newViolation = {
    id: Date.now().toString(),
    username: formData.get('username'),
    type: formData.get('type'),
    description: formData.get('description'),
    points: parseInt(formData.get('points')),
    date: new Date().toISOString()
  };

  violations.push(newViolation);
  localStorage.setItem('violations', JSON.stringify(violations));

  // 更新用户积分
  const pointsHistory = JSON.parse(localStorage.getItem('pointsHistory')) || {};
  if (!pointsHistory[newViolation.username]) {
    pointsHistory[newViolation.username] = [];
  }

  pointsHistory[newViolation.username].push({
    date: newViolation.date,
    points: -newViolation.points,
    reason: `违规：${newViolation.description}`
  });

  localStorage.setItem('pointsHistory', JSON.stringify(pointsHistory));

  // 更新页面
  closeViolationModal();
  loadViolations();
  updatePointsOverview();
  initPointsTrendChart();
}

// 生成报告
function generateReport() {
  const reportType = document.getElementById('reportType').value;
  const date = document.getElementById('reportDate').value;

  // 获取筛选后的数据
  const filteredData = filterDataByDate(date, reportType);

  // 生成报告内容
  const reportContent = document.getElementById('reportContent');
  reportContent.innerHTML = `
    <div class="report-header">
      <h4>${getReportTitle(reportType)}报告</h4>
      <p>生成时间：${new Date().toLocaleString()}</p>
    </div>
    
    <div class="report-section">
      <h5>活动统计</h5>
      <p>总活动数：${filteredData.activities.length}</p>
      <p>参与人数：${filteredData.participants}</p>
      <p>平均参与率：${(filteredData.participants / filteredData.activities.length).toFixed(1)}%</p>
    </div>
    
    <div class="report-section">
      <h5>积分统计</h5>
      <p>总积分：${filteredData.totalPoints}</p>
      <p>平均积分：${(filteredData.totalPoints / filteredData.participants).toFixed(1)}</p>
      <p>最高积分：${filteredData.maxPoints}</p>
      <p>最低积分：${filteredData.minPoints}</p>
    </div>
    
    <div class="report-section">
      <h5>违规统计</h5>
      <p>违规次数：${filteredData.violations.length}</p>
      <p>扣除总积分：${filteredData.deductedPoints}</p>
    </div>
    
    <div class="report-section">
      <h5>活动效果分析</h5>
      <p>${generateEffectAnalysis(filteredData)}</p>
    </div>
  `;
}

// 根据日期筛选数据
function filterDataByDate(date, type) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const violations = JSON.parse(localStorage.getItem('violations')) || [];

  const startDate = new Date(date);
  let endDate = new Date(date);

  switch (type) {
    case 'day':
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'week':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'month':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
  }

  return {
    activities: activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate >= startDate && activityDate < endDate;
    }),
    participants: calculateParticipants(startDate, endDate),
    totalPoints: calculateTotalPoints(startDate, endDate),
    maxPoints: calculateMaxPoints(startDate, endDate),
    minPoints: calculateMinPoints(startDate, endDate),
    violations: violations.filter(violation => {
      const violationDate = new Date(violation.date);
      return violationDate >= startDate && violationDate < endDate;
    }),
    deductedPoints: calculateDeductedPoints(startDate, endDate)
  };
}

// 计算总积分
function calculateTotalPoints(startDate, endDate) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  let total = 0;

  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      activity.checkIns.forEach(checkIn => {
        const checkInDate = new Date(checkIn.checkInTime);
        if (checkInDate >= startDate && checkInDate < endDate) {
          total += activity.points || 0;
        }
      });
    }
  });

  return total;
}

// 计算最高积分
function calculateMaxPoints(startDate, endDate) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  let max = 0;

  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      const userPoints = activity.checkIns
        .filter(checkIn => {
          const checkInDate = new Date(checkIn.checkInTime);
          return checkInDate >= startDate && checkInDate < endDate;
        })
        .reduce((sum, checkIn) => sum + (activity.points || 0), 0);

      max = Math.max(max, userPoints);
    }
  });

  return max;
}

// 计算最低积分
function calculateMinPoints(startDate, endDate) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  let min = Infinity;

  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      const userPoints = activity.checkIns
        .filter(checkIn => {
          const checkInDate = new Date(checkIn.checkInTime);
          return checkInDate >= startDate && checkInDate < endDate;
        })
        .reduce((sum, checkIn) => sum + (activity.points || 0), 0);

      if (userPoints > 0) {
        min = Math.min(min, userPoints);
      }
    }
  });

  return min === Infinity ? 0 : min;
}

// 计算参与人数
function calculateParticipants(startDate, endDate) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const uniqueParticipants = new Set();

  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      activity.checkIns.forEach(checkIn => {
        const checkInDate = new Date(checkIn.checkInTime);
        if (checkInDate >= startDate && checkInDate < endDate) {
          uniqueParticipants.add(checkIn.username);
        }
      });
    }
  });

  return uniqueParticipants.size;
}

// 计算扣除积分
function calculateDeductedPoints(startDate, endDate) {
  const violations = JSON.parse(localStorage.getItem('violations')) || [];
  return violations
    .filter(violation => {
      const violationDate = new Date(violation.date);
      return violationDate >= startDate && violationDate < endDate;
    })
    .reduce((sum, violation) => sum + violation.points, 0);
}

// 获取报告标题
function getReportTitle(type) {
  const titles = {
    'daily': '每日',
    'weekly': '每周',
    'monthly': '每月'
  };
  return titles[type] || '';
}

// 生成效果分析
function generateEffectAnalysis(data) {
  const participationRate = (data.participants / data.activities.length).toFixed(1);
  const averagePoints = (data.totalPoints / data.participants).toFixed(1);

  let analysis = '';

  if (participationRate > 80) {
    analysis += '活动参与率较高，';
  } else if (participationRate > 50) {
    analysis += '活动参与率一般，';
  } else {
    analysis += '活动参与率较低，';
  }

  if (averagePoints > 10) {
    analysis += '用户参与积极性高，';
  } else if (averagePoints > 5) {
    analysis += '用户参与积极性一般，';
  } else {
    analysis += '用户参与积极性较低，';
  }

  if (data.violations.length > 0) {
    analysis += `存在${data.violations.length}起违规行为，`;
  } else {
    analysis += '未发现违规行为，';
  }

  analysis += '建议继续加强活动管理和监督。';

  return analysis;
}

// 获取违规类型文本
function getViolationTypeText(type) {
  const types = {
    'cheating': '作弊',
    'absent': '无故缺席',
    'disruption': '扰乱秩序',
    'other': '其他'
  };
  return types[type] || type;
}