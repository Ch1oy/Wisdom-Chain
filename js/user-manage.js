// 分页相关变量
let currentPage = 1;
const usersPerPage = 6;
let filteredUsers = [];

document.addEventListener('DOMContentLoaded', function () {
  // 检查是否已登录且是管理员
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo || userInfo.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  // 获取筛选和搜索元素以及分页控件元素
  const roleFilter = document.getElementById('roleFilter');
  const searchInput = document.getElementById('searchInput');
  const userList = document.getElementById('userList');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const currentPageSpan = document.getElementById('currentPage');
  const totalPagesSpan = document.getElementById('totalPages');
  const clearSearchBtn = document.getElementById('clearSearchBtn'); // 获取清除按钮元素

  // 添加事件监听器
  roleFilter.addEventListener('change', () => {
    currentPage = 1;
    filterUsers();
  });
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    filterUsers();
  });
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderUsers();
    }
  });
  nextPageBtn.addEventListener('click', () => {
    if (currentPage < Math.ceil(filteredUsers.length / usersPerPage)) {
      currentPage++;
      renderUsers();
    }
  });

  // 清除搜索按钮点击事件
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = ''; // 清空搜索框
    currentPage = 1; // 重置页码
    filterUsers(); // 重新过滤并渲染用户列表
  });

  // 处理模态框关闭按钮
  const modalClose = document.querySelector('.close');
  if (modalClose) {
    modalClose.addEventListener('click', function () {
      const modal = document.getElementById('userModal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = ''; // 恢复背景滚动
      }
    });
  }

  // 点击模态框外部关闭
  window.addEventListener('click', function (event) {
    const modal = document.getElementById('userModal');
    if (event.target === modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.style.overflow = ''; // 恢复背景滚动
    }
  });

  // 重置密码按钮点击事件
  const resetPasswordBtn = document.getElementById('resetPasswordBtn');
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', function () {
      const userDetails = document.getElementById('userDetails');
      const username = userDetails.querySelector('.user-detail-info p').textContent;
      const userName = userDetails.querySelector('.user-detail-info h2').textContent;

      if (confirm(`确定要将用户 ${userName}(${username}) 的密码重置为 123456 吗？`)) {
        resetPassword(username);
      }
    });
  }

  // 初始加载用户列表
  loadUsers();
});

// 加载用户列表
function loadUsers() {
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const allUsers = Object.entries(users).filter(([_, user]) => user.role !== 'admin');
  filteredUsers = allUsers; // 初始化 filteredUsers 为所有非管理员用户

  // 计算不同角色的用户数量
  const totalUsersCount = allUsers.length;
  const studentCount = allUsers.filter(([_, user]) => user.role === 'student').length;
  const clubLeaderCount = allUsers.filter(([_, user]) => user.role === 'clubLeader').length;

  // 更新筛选选项的文本
  document.querySelector('#roleFilter option[value="all"]').textContent = `所有用户 (${totalUsersCount})`;
  document.querySelector('#roleFilter option[value="student"]').textContent = `学生用户 (${studentCount})`;
  document.querySelector('#roleFilter option[value="clubLeader"]').textContent = `社团负责人 (${clubLeaderCount})`;

  renderUsers();
}

// 渲染用户列表
function renderUsers() {
  const userList = document.getElementById('userList');
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentPageUsers = filteredUsers.slice(startIndex, endIndex);

  if (currentPageUsers.length === 0) {
    userList.innerHTML = '<p class="no-data">暂无用户数据</p>';
    return;
  }

  userList.innerHTML = currentPageUsers.map(([username, user]) => `
    <div class="user-card" data-username="${username}">
      <div class="user-info">
        <img src="${user.avatar || 'images/default-avatar.png'}" alt="头像" class="user-avatar">
        <div class="user-details">
          <h3>${user.name || username}</h3>
          <p>学号/工号：${username}</p>
          <p>角色：<span class="user-role role-${user.role}">${getRoleText(user.role)}</span></p>
          <p>状态：<span class="user-status status-${user.status || 'active'}">${user.status === 'disabled' ? '已禁用' : '正常'}</span></p>
        </div>
      </div>
      <div class="user-stats">
        <p>参与活动：${getUserActivityCount(username)}</p>
        <p>获得积分：${getUserPoints(username)}</p>
      </div>
    </div>
  `).join('');

  // 更新分页信息
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;

  // 添加点击事件监听器
  const userCards = document.querySelectorAll('.user-card');
  userCards.forEach(card => {
    card.addEventListener('click', function () {
      const username = this.dataset.username;
      showUserDetails(username);
    });
  });
}

// 筛选用户
function filterUsers() {
  const roleFilter = document.getElementById('roleFilter');
  const searchInput = document.getElementById('searchInput');
  const users = JSON.parse(localStorage.getItem('users')) || {};

  // 过滤掉管理员用户，然后根据筛选条件过滤
  filteredUsers = Object.entries(users)
    .filter(([_, user]) => user.role !== 'admin')
    .filter(([username, user]) => {
      const roleMatch = roleFilter.value === 'all' || user.role === roleFilter.value;
      const searchTerm = searchInput.value.trim(); // 对搜索词进行trim()
      const searchMatch = username.includes(searchTerm) ||
        (user.name && user.name.includes(searchTerm));
      return roleMatch && searchMatch;
    });

  // 过滤完成后，总是调用 renderUsers 来根据当前页码渲染用户列表
  renderUsers();
}

// 获取角色文本
function getRoleText(role) {
  const roleMap = {
    'student': '学生',
    'clubLeader': '社团负责人',
    'admin': '管理员'
  };
  return roleMap[role] || role;
}

// 获取用户参与活动数量（从activities的checkIns统计）
function getUserActivityCount(username) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  let count = 0;
  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      if (activity.checkIns.some(checkIn => checkIn.username === username)) {
        count++;
      }
    }
  });
  return count;
}

// 获取用户积分（从activities的checkIns统计）
function getUserPoints(username) {
  const activities = JSON.parse(localStorage.getItem('activities')) || [];
  let total = 0;
  activities.forEach(activity => {
    if (activity.checkIns && Array.isArray(activity.checkIns)) {
      activity.checkIns.forEach(checkIn => {
        if (checkIn.username === username) {
          total += activity.points || 0;
        }
      });
    }
  });
  return total;
}

// 显示用户详情
function showUserDetails(username) {
  console.log('开始显示用户详情:', username);
  const users = JSON.parse(localStorage.getItem('users')) || {};
  const pointsHistory = JSON.parse(localStorage.getItem('pointsHistory')) || {};
  const user = users[username];
  const userPointsHistory = pointsHistory[username] || [];

  if (!user) {
    console.log('未找到用户:', username);
    return;
  }

  // 更新模态框内容
  const userDetails = document.getElementById('userDetails');
  if (!userDetails) {
    console.log('未找到userDetails元素');
    return;
  }

  userDetails.innerHTML = `
    <div class="user-detail-header">
      <img src="${user.avatar || 'images/default-avatar.png'}" alt="用户头像" class="avatar-large">
      <div class="user-detail-info">
        <h2>${user.name || '未设置姓名'}</h2>
        <p>${username}</p>
        <p class="user-role role-${user.role}">${getRoleText(user.role)}</p>
      </div>
    </div>
    <div class="user-detail-content">
      <div class="detail-section">
        <h3>基本信息</h3>
        <div class="detail-item">
          <span class="detail-label">学号/工号：</span>
          <span>${username}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">姓名：</span>
          <span>${user.name || '未设置'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">性别：</span>
          <span>${user.gender || '未设置'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">学院：</span>
          <span>${user.college || '未设置'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">联系电话：</span>
          <span>${user.phone || '未设置'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">电子邮箱：</span>
          <span>${user.email || '未设置'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">角色：</span>
          <span class="user-role role-${user.role}">${getRoleText(user.role)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">状态：</span>
          <span class="user-status status-${user.status || 'active'}">${user.status === 'disabled' ? '已禁用' : '正常'}</span>
        </div>
      </div>
      <div class="detail-section">
        <h3>积分信息</h3>
        <div class="detail-item">
          <span class="detail-label">当前积分：</span>
          <span>${getUserPoints(username)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">参与活动：</span>
          <span>${getUserActivityCount(username)}</span>
        </div>
      </div>
    </div>
  `;

  // 显示模态框
  const modal = document.getElementById('userModal');
  if (!modal) {
    console.log('未找到userModal元素');
    return;
  }

  console.log('显示模态框');
  modal.style.display = 'block';
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// 重置密码函数
function resetPassword(username) {
  const users = JSON.parse(localStorage.getItem('users')) || {};
  if (users[username]) {
    // 更新密码
    users[username].password = '123456';
    localStorage.setItem('users', JSON.stringify(users));

    // 显示成功提示
    alert('密码重置成功！新密码为：123456');

    // 关闭模态框
    const modal = document.getElementById('userModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  } else {
    alert('用户不存在！');
  }
} 