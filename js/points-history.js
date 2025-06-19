document.addEventListener('DOMContentLoaded', function () {
  console.log('DOMContentLoaded 事件触发');
  // 检查是否已登录
  const userInfo = Utils.DataManager.load('userInfo');
  console.log('加载到的用户信息:', userInfo);
  if (!userInfo) {
    Utils.Navigation.goto('index.html');
    return;
  }

  // 获取用户详细信息
  const users = Utils.DataManager.load('users') || {};
  const userDetails = users[userInfo.username] || {};

  // 更新用户信息显示
  document.getElementById('userName').textContent = userInfo.username;
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar && userDetails.avatar) {
    userAvatar.src = userDetails.avatar;
  }

  // 处理导航栏事件
  const editProfileBtn = document.getElementById('editProfile');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Utils.Navigation.goto('edit-profile.html');
    });
  }

  const changePasswordBtn = document.getElementById('changePassword');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Utils.Navigation.goto('change-password.html');
    });
  }

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      const confirmed = await Utils.UI.confirm('确定要退出登录吗？');
      if (confirmed) {
        Utils.DataManager.save('userInfo', null);
        Utils.Navigation.goto('index.html');
      }
    });
  }

  // 加载积分信息
  loadPointsInfo();

  // 处理导出按钮点击事件
  document.getElementById('exportBtn').addEventListener('click', exportPointsHistory);
});

// 加载积分信息
async function loadPointsInfo() {
  Utils.UI.showLoading('加载积分信息...');

  try {
    const userInfo = Utils.DataManager.load('userInfo');
    console.log('当前登录用户:', userInfo.username);
    const activities = Utils.DataManager.load('activities') || [];
    console.log('加载到的活动数据:', activities);

    // 从所有活动的checkIns数组中获取当前用户的签到记录
    const checkInRecords = [];
    activities.forEach(activity => {
      if (activity.checkIns && Array.isArray(activity.checkIns)) {
        activity.checkIns.forEach(checkIn => {
          if (checkIn.username === userInfo.username) {
            checkInRecords.push({
              activityId: activity.id,
              activityName: activity.name,
              date: checkIn.checkInTime, // 使用checkIn对象中的时间
              points: activity.points,  // 使用活动本身的积分值
              checkInStatus: 'checked'
            });
          }
        });
      }
    });

    console.log('筛选出的签到记录:', checkInRecords);

    // 计算总积分
    const totalPoints = checkInRecords.reduce((sum, record) => sum + record.points, 0);
    const totalPointsElement = document.getElementById('totalPoints');
    if (totalPointsElement) {
      totalPointsElement.textContent = totalPoints;
    }
    console.log('计算出的总积分:', totalPoints);

    // 显示积分历史
    const historyList = document.getElementById('pointsHistoryList');
    console.log('获取到的 pointsHistoryList 元素:', historyList);
    if (!historyList) {
      console.error('未找到 ID 为 pointsHistoryList 的元素');
      Utils.UI.showToast('积分记录列表容器不存在', 'error');
      return;
    }

    if (checkInRecords.length === 0) {
      historyList.innerHTML = '<p class="no-history">暂无积分记录</p>';
      return;
    }

    // 按时间倒序排序
    checkInRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 按月份分组显示
    const groupedHistory = groupByMonth(checkInRecords);

    const historyHtml = Object.entries(groupedHistory).map(([month, records]) => `
      <div class="history-month">
        <h3 class="month-title">${month}</h3>
        ${records.map(record => `
          <div class="history-item animate-fade-in">
            <div class="history-info">
              <h4>${record.activityName}</h4>
              <p class="history-date">${formatDate(record.date)}</p>
              <p class="check-in-status">已签到</p>
            </div>
            <div class="history-points">
              <span class="points-value positive">
                +${record.points}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    console.log('生成的积分记录HTML:', historyHtml);

    historyList.innerHTML = historyHtml;

    // 初始化积分趋势图
    initPointsChart(checkInRecords);
  } catch (error) {
    console.error('加载积分信息失败:', error);
    Utils.UI.showToast('加载积分信息失败', 'error');
  } finally {
    Utils.UI.hideLoading();
  }
}

// 按月份分组
function groupByMonth(history) {
  return history.reduce((groups, record) => {
    const date = new Date(record.date);
    const month = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(record);
    return groups;
  }, {});
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 初始化积分趋势图
function initPointsChart(history) {
  const chartCanvas = document.getElementById('pointsChart');
  if (!chartCanvas) {
    console.error('未找到 ID 为 pointsChart 的 canvas 元素');
    return;
  }
  const ctx = chartCanvas.getContext('2d');

  // 准备图表数据
  const dates = history.map(record => formatDate(record.date));
  const points = history.map(record => record.points);
  const cumulativePoints = points.reduce((acc, curr) => {
    const last = acc[acc.length - 1] || 0;
    acc.push(last + curr);
    return acc;
  }, []);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.reverse(),
      datasets: [{
        label: '积分趋势',
        data: cumulativePoints.reverse(),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
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
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function (context) {
              return `积分: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// 导出积分历史
function exportPointsHistory() {
  const userInfo = Utils.DataManager.load('userInfo');
  const pointsHistory = Utils.DataManager.load('pointsHistory') || {};
  const userHistory = pointsHistory[userInfo.username] || [];

  if (userHistory.length === 0) {
    Utils.UI.showToast('暂无积分记录可导出', 'warning');
    return;
  }

  // 准备CSV数据
  const csvContent = [
    ['活动名称', '获得积分', '时间'],
    ...userHistory.map(record => [
      record.activityName,
      record.points,
      formatDate(record.date)
    ])
  ].map(row => row.join(',')).join('\n');

  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `积分历史_${userInfo.username}_${new Date().toLocaleDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  Utils.UI.showToast('导出成功！', 'success');
} 