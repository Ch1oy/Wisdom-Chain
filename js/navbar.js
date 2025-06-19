// 导航栏配置
const navConfig = {
  student: [
    { text: '首页', href: 'home.html', icon: 'ri-home-line' },
    { text: '活动列表', href: 'activities.html', icon: 'ri-calendar-event-line' },
    { text: '我的活动', href: 'my-registrations.html', icon: 'ri-calendar-check-fill' },
    { text: '我的积分', href: 'points-history.html', icon: 'ri-coins-line' },
    { text: '我的抽奖', href: 'draw.html', icon: 'ri-gift-line' }
  ],
  club_leader: [
    { text: '活动管理', href: 'club-activity-manage.html', icon: 'ri-calendar-check-line' },
    { text: '发布新活动', href: 'publish-activity.html', icon: 'ri-add-circle-line' },
    { text: '我的发布', href: 'my-activities.html', icon: 'ri-file-list-line' },
    { text: '报名管理', href: 'registration-manage.html', icon: 'ri-user-add-line' }
  ],
  admin: [
    { text: '活动审核', href: 'admin-review.html', icon: 'ri-check-double-line' },
    { text: '用户管理', href: 'user-manage.html', icon: 'ri-user-settings-line' },
    { text: '积分管理', href: 'points-manage.html', icon: 'ri-coins-line' },
    { text: '奖池管理', href: 'prize-pool.html', icon: 'ri-gift-line' }
  ]
};

// 创建导航栏
function createNavbar() {
  const userInfo = Utils.DataManager.load('userInfo');
  if (!userInfo) {
    Utils.Navigation.goto('index.html');
    return;
  }

  // 移除现有的导航栏（如果存在）
  const existingNav = document.querySelector('.navbar');
  if (existingNav) {
    existingNav.remove();
  }

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';

  // 创建导航栏容器
  const navbarContainer = document.createElement('div');
  navbarContainer.className = 'navbar-container';

  // 创建品牌名称
  const brand = document.createElement('a');
  brand.className = 'navbar-brand';
  brand.href = '#';
  brand.innerHTML = '<img src="images/logo.png" alt="logo" class="logo">智汇链';
  navbarContainer.appendChild(brand);

  // 创建导航菜单
  const navbarMenu = document.createElement('div');
  navbarMenu.className = 'navbar-menu';

  // 根据用户角色添加导航链接
  const links = navConfig[userInfo.role] || [];
  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'navbar-item';
    a.href = link.href;
    a.innerHTML = `<i class="${link.icon}"></i>${link.text}`;
    navbarMenu.appendChild(a);
  });

  // 创建用户信息区域
  const userProfile = document.createElement('div');
  userProfile.className = 'user-profile';

  // 获取用户详细信息
  const users = Utils.DataManager.load('users') || {};
  const userDetails = users[userInfo.username] || {};

  // 创建头像
  const avatar = document.createElement('img');
  avatar.src = userDetails.avatar || 'images/default-avatar.png';
  avatar.alt = '用户头像';
  avatar.className = 'avatar';
  userProfile.appendChild(avatar);

  // 创建用户名
  const userName = document.createElement('span');
  userName.id = 'userName';
  userName.textContent = userDetails.name || userInfo.username;
  userProfile.appendChild(userName);

  // 创建下拉菜单
  const dropdownContent = document.createElement('div');
  dropdownContent.className = 'dropdown-content';

  // 添加下拉菜单选项
  const menuItems = [
    { text: '编辑资料', href: 'edit-profile.html', icon: 'ri-user-settings-line' },
    { text: '修改密码', href: 'change-password.html', icon: 'ri-lock-password-line' },
    { text: '退出登录', href: '#', icon: 'ri-logout-box-line', id: 'logout' }
  ];

  menuItems.forEach(item => {
    const a = document.createElement('a');
    a.href = item.href;
    a.id = item.id;
    a.innerHTML = `<i class="${item.icon}"></i>${item.text}`;
    if (item.id === 'logout') {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        Utils.DataManager.remove('userInfo');
        Utils.Navigation.goto('index.html');
      });
    }
    dropdownContent.appendChild(a);
  });

  userProfile.appendChild(dropdownContent);
  navbarMenu.appendChild(userProfile);
  navbarContainer.appendChild(navbarMenu);
  navbar.appendChild(navbarContainer);

  // 将导航栏插入到页面中
  document.body.insertBefore(navbar, document.body.firstChild);

  // 添加事件监听器
  document.addEventListener('click', function (e) {
    const target = e.target;
    const userProfile = document.querySelector('.user-profile');

    // 点击用户头像时切换下拉菜单显示
    if (target.closest('.user-profile')) {
      const dropdown = userProfile.querySelector('.dropdown-content');
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    } else {
      // 点击其他地方时隐藏下拉菜单
      const dropdowns = document.querySelectorAll('.dropdown-content');
      dropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
      });
    }
  });
}

// 页面加载完成后创建导航栏
document.addEventListener('DOMContentLoaded', createNavbar); 