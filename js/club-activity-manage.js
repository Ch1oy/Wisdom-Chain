document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录且是社团负责人
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo || userInfo.role !== 'club_leader') {
    window.location.href = 'index.html';
    return;
  }

  // 获取用户详细信息
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  document.getElementById('userName').textContent = userInfo.username;
  const userAvatar = document.getElementById('userAvatar');
  if (userDetails.avatar) {
    userAvatar.src = userDetails.avatar;
  }

  // 月份选择器逻辑
  const monthPicker = document.getElementById('monthPicker');
  if (monthPicker) {
    // 默认选中本月
    const now = new Date();
    monthPicker.value = now.toISOString().slice(0, 7);
    monthPicker.addEventListener('change', function () {
      filterAndUpdateDashboardByMonth(this.value);
    });
    // 页面初始化时也加载本月
    filterAndUpdateDashboardByMonth(monthPicker.value);
  } else {
    // 兼容无月份选择器时的旧逻辑
    loadDashboard();
  }
});

function filterAndUpdateDashboardByMonth(monthStr) {
  // monthStr格式为 '2024-06'
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  console.log('所有活动:', activities);
  console.log('当前用户:', userInfo);

  // 只筛选当前负责人发布的活动
  let filtered = activities.filter(a => a.publisher === userInfo.username);
  console.log('用户发布的活动:', filtered);

  // 再筛选月份
  filtered = filtered.filter(a => {
    const d = new Date(a.startTime || a.date);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const [selY, selM] = monthStr.split('-').map(Number);
    console.log('活动日期:', d, '月份:', m, '年份:', y);
    console.log('选择月份:', selM, '选择年份:', selY);
    return y === selY && m === selM;
  });
  console.log('筛选后的活动:', filtered);

  updateDashboardCards(filtered);
  createStatusChart(filtered);
  createTimeChart(filtered, monthStr);
}

// 加载数据看板
function loadDashboard() {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  console.log('加载数据看板 - 所有活动:', activities);
  console.log('加载数据看板 - 当前用户:', userInfo);

  // 只统计当前用户发布的活动
  const userActivities = activities.filter(activity => activity.publisher === userInfo.username);
  console.log('加载数据看板 - 用户发布的活动:', userActivities);

  // 更新卡片数据
  updateDashboardCards(userActivities);

  // 创建图表
  createStatusChart(userActivities);
  createTimeChart(userActivities);
}

// 更新卡片数据
function updateDashboardCards(activities) {
  console.log('更新卡片数据 - 活动列表:', activities);

  // 更新活动总数
  document.getElementById('totalActivities').textContent = activities.length;

  // 更新已通过活动数
  const approvedActivities = activities.filter(activity => activity.status === 'approved').length;
  document.getElementById('approvedActivities').textContent = approvedActivities;

  // 更新总参与人数
  const totalParticipants = activities.reduce((sum, activity) => {
    return sum + (activity.participants ? activity.participants.length : 0);
  }, 0);
  document.getElementById('totalParticipants').textContent = totalParticipants;
}

// 全局变量保存图表实例
let statusChartInstance = null;
let timeChartInstance = null;

// 创建状态分布图表
function createStatusChart(activities) {
  if (statusChartInstance) {
    statusChartInstance.destroy();
  }
  const statusCounts = {
    pending: activities.filter(a => a.status === 'pending').length,
    approved: activities.filter(a => a.status === 'approved').length,
    rejected: activities.filter(a => a.status === 'rejected').length
  };
  const ctx = document.getElementById('statusChart').getContext('2d');
  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['待审核', '已通过', '已拒绝'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected],
        backgroundColor: ['#FFBE0B', '#2EC4B6', '#E63946']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// 创建时间分布图表
function createTimeChart(activities, monthStr) {
  if (timeChartInstance) {
    timeChartInstance.destroy();
  }
  // 获取选中月份
  let currentMonth, currentYear;
  if (monthStr) {
    const [y, m] = monthStr.split('-').map(Number);
    currentYear = y;
    currentMonth = m - 1;
  } else {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
  }

  // 初始化当月所有日期的数据
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyData = Array(daysInMonth).fill(0);

  // 统计当月活动
  activities.forEach(activity => {
    const date = new Date(activity.startTime || activity.date);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      const day = date.getDate() - 1; // 数组索引从0开始
      dailyData[day]++;
    }
  });

  // 生成日期标签
  const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`);

  const ctx = document.getElementById('timeChart').getContext('2d');
  timeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '活动数量',
        data: dailyData,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3498db',
        pointBorderColor: '#fff',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#2980b9',
        pointHoverBorderColor: '#fff',
        pointHitRadius: 10,
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `活动数量: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          title: {
            display: true,
            text: '活动数量'
          }
        },
        x: {
          title: {
            display: true,
            text: '日期'
          }
        }
      }
    }
  });
}