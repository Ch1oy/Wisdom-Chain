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

  // 处理用户菜单事件
  document.getElementById('editProfile').addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'edit-profile.html';
  });

  document.getElementById('changePassword').addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'change-password.html';
  });

  document.getElementById('logout').addEventListener('click', function (e) {
    e.preventDefault();
    localStorage.removeItem('userInfo');
    window.location.href = 'index.html';
  });

  // 加载报名管理列表
  loadRegistrationManagement();
});

// 加载报名管理
function loadRegistrationManagement() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const container = document.getElementById('registrationActivities');

  // 只显示当前用户发布的且已通过审核的活动
  const userActivities = activities.filter(activity =>
    activity.publisher === userInfo.username && activity.status === 'approved'
  );

  if (userActivities.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-clipboard-list"></i>
        <p>暂无可管理的活动</p>
        <p class="sub-text">您发布的活动通过审核后将在此显示</p>
      </div>`;
    return;
  }

  // 使用表格形式展示活动信息
  let tableHtml = `
    <table class="activity-table">
      <thead>
        <tr>
          <th>活动名称</th>
          <th>活动时间</th>
          <th>活动地点</th>
          <th>报名人数</th>
          <th>报名截止</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  tableHtml += userActivities.map(activity => `
    <tr>
      <td>${activity.title || activity.name}</td>
      <td>${new Date(activity.startTime || activity.date).toLocaleString()}</td>
      <td>${activity.location || '未设置'}</td>
      <td>${activity.participants ? activity.participants.length : 0}/${activity.capacity}</td>
      <td>${new Date(activity.registrationDeadline).toLocaleString()}</td>
      <td>
        <button class="btn btn-primary view-registrations" onclick="showRegistrationList('${activity.id}')">
          <i class="fas fa-list"></i> 查看报名情况
        </button>
      </td>
    </tr>
    <tr>
      <td colspan="6">
        <div id="registration-list-${activity.id}" class="registration-list" style="display: none;">
          <div class="registration-header">
            <h4>报名名单</h4>
            ${activity.participants && activity.participants.length > 0 ? `
              <button class="btn btn-secondary export-btn" onclick="exportRegistrations('${activity.id}')">
                <i class="ri-file-download-line"></i> 导出名单
              </button>
            ` : ''}
          </div>
          <div class="registration-items">
            ${getRegistrationList(activity)}
          </div>
        </div>
      </td>
    </tr>
  `).join('');

  tableHtml += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;
}

// 显示报名名单
function showRegistrationList(activityId) {
  const registrationList = document.getElementById(`registration-list-${activityId}`);
  if (registrationList) {
    registrationList.style.display = registrationList.style.display === 'none' ? 'block' : 'none';
  }
}

// 获取报名列表
function getRegistrationList(activity) {
  if (!activity.participants || activity.participants.length === 0) {
    return '<p>暂无报名记录</p>';
  }

  // 获取所有用户信息
  const users = JSON.parse(localStorage.getItem('users')) || {};

  return `
  <table class="registration-table">
  <thead>
    <tr>
      <th>序号</th>
      <th>姓名</th>
      <th>学号</th>
      <th>联系电话</th>
      <th>报名时间</th>
    </tr>
  </thead>
  <tbody>
    ${activity.participants.map((participant, index) => {
    const userInfo = users[participant.username] || {};
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${participant.name || participant.username}</td>
        <td>${participant.username || '未填写'}</td>
        <td>${userInfo.phone || '未填写'}</td>
        <td>${new Date(participant.registerTime || Date.now()).toLocaleString()}</td>
      </tr>
    `}).join('')}
  </tbody>
</table>
    `
    ;
}

// 管理报名
function manageRegistration(activityId) {
  // TODO: 实现报名管理功能
  alert('报名管理功能开发中...');
}

// 通过报名
function approveRegistration(activityId, username) {
  // TODO: 实现通过报名功能
  alert('通过报名功能开发中...');
}

// 拒绝报名
function rejectRegistration(activityId, username) {
  // TODO: 实现拒绝报名功能
  alert('拒绝报名功能开发中...');
}

// 导出报名名单
function exportRegistrations(activityId) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  const activity = activities.find(a => a.id === activityId);
  const users = JSON.parse(localStorage.getItem('users')) || {};

  if (!activity || !activity.participants || activity.participants.length === 0) {
    Utils.UI.showToast('暂无报名数据可导出', 'warning');
    return;
  }

  // 创建CSV内容
  const headers = ['序号', '姓名', '学号', '联系电话', '报名时间'];
  const rows = activity.participants.map((participant, index) => {
    const userInfo = users[participant.username] || {};
    return [
      index + 1,
      participant.name || participant.username,
      participant.username,
      userInfo.phone || '未填写',
      new Date(participant.registerTime || Date.now()).toLocaleString()
    ];
  });

  // 组合CSV内容
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // 创建Blob对象
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  // 创建下载链接
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${activity.name}-报名名单.csv`);
  document.body.appendChild(link);

  // 触发下载
  link.click();

  // 清理
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
} 