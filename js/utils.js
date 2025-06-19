const Utils = {
  // 数据管理工具
  DataManager: {
    load(key) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    },
    save(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem(key);
    }
  },

  // UI 工具
  UI: {
    showLoading(message = '加载中...') {
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        const spinner = loadingOverlay.querySelector('.loading-spinner');
        if (spinner) {
          spinner.textContent = message;
        }
      }
    },

    hideLoading() {
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    },

    showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            toast.style.display = 'none';
          }, 300);
        }, 3000);
      }
    }
  },

  // 验证工具
  Validator: {
    required(value) {
      return value !== null && value !== undefined && value !== '';
    },
    isEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    isPhone(phone) {
      const re = /^1[3-9]\d{9}$/;
      return re.test(phone);
    },
    isPasswordStrong(password) {
      // 至少8位，包含大小写字母、数字和特殊字符
      const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return re.test(password);
    }
  },

  // 导航工具
  Navigation: {
    goto(url) {
      window.location.href = url;
    },
    back() {
      window.history.back();
    }
  },

  // 日期格式化工具
  DateFormatter: {
    format(date, format = 'YYYY-MM-DD HH:mm:ss') {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    }
  }
}; 