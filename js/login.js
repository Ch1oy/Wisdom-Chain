document.addEventListener('DOMContentLoaded', function () {
  // 初始化预设账户数据
  initializePresetAccounts();

  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    // 显示加载状态
    Utils.UI.showLoading('登录中...');

    try {
      // 验证表单
      if (!Utils.Validator.required(username)) {
        throw new Error('请输入用户名');
      }

      if (!Utils.Validator.required(password)) {
        throw new Error('请输入密码');
      }

      // 获取用户信息
      const users = Utils.DataManager.load('users') || {};

      // 验证用户身份
      if (role === 'student') {
        // 验证学生账户
        if (isValidStudent(username)) {
          const user = users[username];
          // 检查用户是否已经设置过密码
          if (user.password) {
            if (password === user.password) {
              loginSuccess({
                username: username,
                role: role,
                isFirstLogin: false
              });
            } else {
              throw new Error('密码错误！');
            }
          } else {
            if (password === '123456') {
              loginSuccess({
                username: username,
                role: role,
                isFirstLogin: true
              });
            } else {
              throw new Error('密码错误！请使用初始密码123456登录');
            }
          }
        } else {
          throw new Error('学号不存在！');
        }
      } else if (role === 'clubLeader') {
        // 验证社团负责人账户
        if (isValidClubLeader(username)) {
          if (password === '888888' || password === users[username]?.password) {
            loginSuccess({
              username: username,
              role: 'club_leader',
              isFirstLogin: false
            });
          } else {
            throw new Error('密码错误！');
          }
        } else {
          throw new Error('社团负责人账号不存在！');
        }
      } else if (role === 'admin') {
        // 验证管理员账户
        if (username === '20251314') {
          if (password === '666666' || password === users[username]?.password) {
            loginSuccess({
              username: username,
              role: role,
              isFirstLogin: false
            });
          } else {
            throw new Error('密码错误！');
          }
        } else {
          throw new Error('管理员账号不存在！');
        }
      }
    } catch (error) {
      Utils.UI.showToast(error.message, 'error');
    } finally {
      Utils.UI.hideLoading();
    }
  });
});

// 初始化预设账户
function initializePresetAccounts() {
  const users = Utils.DataManager.load('users') || {};

  // 预设学生账户
  const studentAccounts = ['20250701', '20250702', '20250703', '20250704', '20250705', '20250706', '20250707', '20250708', '20250709', '20250710'];
  studentAccounts.forEach(username => {
    if (!users[username]) {
      users[username] = {
        role: 'student',
        password: null,
        name: '',
        studentId: '',
        college: '',
        email: '',
        phone: '',
        bio: '',
        avatar: null
      };
    }
  });

  // 预设社团负责人账户
  const clubLeaderAccounts = ['20250601', '20250602', '20250603'];
  clubLeaderAccounts.forEach(username => {
    if (!users[username]) {
      users[username] = {
        role: 'clubLeader',
        password: null,
        name: '',
        studentId: '',
        college: '',
        email: '',
        phone: '',
        bio: '',
        avatar: null
      };
    }
  });

  // 预设管理员账户
  if (!users['20251314']) {
    users['20251314'] = {
      role: 'admin',
      password: null,
      name: '系统管理员',
      studentId: '',
      college: '',
      email: '',
      phone: '',
      bio: '',
      avatar: null
    };
  }

  Utils.DataManager.save('users', users);
}

// 验证学生账户
function isValidStudent(username) {
  const validStudents = ['20250701', '20250702', '20250703', '20250704', '20250705', '20250706', '20250707', '20250708', '20250709', '20250710'];
  return validStudents.includes(username);
}

// 验证社团负责人账户
function isValidClubLeader(username) {
  const validLeaders = ['20250601', '20250602', '20250603'];
  return validLeaders.includes(username);
}

// 登录成功处理
function loginSuccess(userInfo) {
  Utils.DataManager.save('userInfo', userInfo);
  Utils.UI.showToast('登录成功！', 'success');

  // 根据角色和是否首次登录跳转到不同页面
  setTimeout(() => {
    if (userInfo.isFirstLogin) {
      Utils.Navigation.goto('change-password.html');
    } else {
      switch (userInfo.role) {
        case 'student':
          Utils.Navigation.goto('home.html');
          break;
        case 'club_leader':
          Utils.Navigation.goto('club-activity-manage.html');
          break;
        case 'admin':
          Utils.Navigation.goto('admin-review.html');
          break;
      }
    }
  }, 1000);
} 