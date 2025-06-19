// 抽奖相关的常量
const PRIZES_STORAGE_KEY = 'prizePoolPrizes';
const DRAW_HISTORY_KEY = 'drawHistory';

// 3D盲盒全局变量
let box3dAnimationId = null;
let box3dScene = null, box3dCamera = null, box3dRenderer = null, box3dBox = null, box3dCanvas = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
  // 检查用户是否登录
  const userInfo = Utils.DataManager.load('userInfo');
  if (!userInfo) {
    Utils.UI.showToast('请先登录', 'warning');
    setTimeout(() => {
      Utils.Navigation.goto('login.html');
    }, 1500);
    return;
  }

  // 将用户信息存储到全局变量，方便其他函数访问
  window.currentUser = userInfo;

  // ===== 显示当前积分 =====
  if (document.getElementById('currentPoints')) {
    // 动态加载getUserPoints函数（如果未全局暴露）
    if (typeof getUserPoints === 'function') {
      document.getElementById('currentPoints').textContent = getUserPoints(userInfo.username);
    } else {
      // 兼容未引入user-manage.js的情况，直接本地实现
      const activities = Utils.DataManager.load('activities') || [];
      let total = 0;
      activities.forEach(activity => {
        if (activity.checkIns && Array.isArray(activity.checkIns)) {
          activity.checkIns.forEach(checkIn => {
            if (checkIn.username === userInfo.username) {
              total += activity.points || 0;
            }
          });
        }
      });
      document.getElementById('currentPoints').textContent = total;
    }
  }
  // ===== end =====

  // 初始化抽奖按钮事件
  const drawBtn = document.getElementById('startDrawBtn');
  console.log('抽奖按钮元素:', drawBtn); // 调试日志

  if (drawBtn) {
    // 移除可能存在的旧事件监听器
    drawBtn.removeEventListener('click', handleDraw);
    // 添加新的事件监听器
    drawBtn.addEventListener('click', function (e) {
      console.log('抽奖按钮被点击'); // 调试日志
      e.preventDefault(); // 阻止默认行为
      handleDraw();
    });
  } else {
    console.error('未找到抽奖按钮元素！'); // 调试日志
  }

  // 加载抽奖历史记录
  loadDrawHistory();

  // 页面加载时渲染3D盲盒 - 只调用一个渲染函数
  renderGiftBox3D(); // 使用新的渲染函数，不再调用 renderPrizeBox3D

  // 获取奖池按钮和模态框元素
  const showPrizePoolBtn = document.getElementById('showPrizePoolBtn');
  const prizePoolModal = document.getElementById('prizePoolModal');
  const prizePoolContent = document.getElementById('prizePoolContent');
  const prizePoolModalClose = prizePoolModal ? prizePoolModal.querySelector('.close') : null;
  const prizePoolModalCloseBtn = prizePoolModal ? prizePoolModal.querySelector('.close-modal') : null;

  // 为查看奖池按钮添加事件监听器
  if (showPrizePoolBtn && prizePoolModal && prizePoolContent) {
    showPrizePoolBtn.addEventListener('click', function () {
      const prizes = getPrizes(); // 获取奖池数据
      if (prizes && prizes.length > 0) {
        // 按概率从低到高排序
        const sortedPrizes = [...prizes].sort((a, b) => a.probability - b.probability);

        // 生成奖池内容的HTML
        prizePoolContent.innerHTML = '' + sortedPrizes.map(prize => {
          // 根据概率确定稀有度
          let probabilityType = 'common';
          if (prize.probability <= 0.1) probabilityType = 'legendary';
          else if (prize.probability <= 0.5) probabilityType = 'epic';
          else if (prize.probability <= 2) probabilityType = 'rare';
          else if (prize.probability <= 5) probabilityType = 'uncommon';

          return `
            <div class="prize-item" data-probability="${probabilityType}">
              <img src="${prize.image}" alt="${prize.name}">
              <div class="prize-name">${prize.name}</div>
              <div class="probability-badge">${prize.probability.toFixed(2)}%</div>
            </div>
          `;
        }).join('');
      } else {
        prizePoolContent.innerHTML = '<p>奖池暂无物品。</p>';
      }
      prizePoolModal.style.display = 'block'; // 显示模态框
    });
  }

  // 为奖池模态框添加关闭事件监听器
  if (prizePoolModal) {
    if (prizePoolModalClose) {
      prizePoolModalClose.addEventListener('click', function () {
        prizePoolModal.style.display = 'none';
      });
    }
    if (prizePoolModalCloseBtn) {
      prizePoolModalCloseBtn.addEventListener('click', function () {
        prizePoolModal.style.display = 'none';
      });
    }
    // 点击模态框外部关闭
    window.addEventListener('click', function (event) {
      if (event.target === prizePoolModal) {
        prizePoolModal.style.display = 'none';
      }
    });
  }
  // ===== end =====
});

// 处理抽奖
function handleDraw() {
  console.log('handleDraw 函数被调用'); // 调试日志

  const drawBtn = document.getElementById('startDrawBtn');
  if (!drawBtn) {
    console.error('handleDraw: 未找到抽奖按钮元素！'); // 调试日志
    return;
  }

  // 获取当前用户信息
  const userInfo = window.currentUser;
  if (!userInfo) {
    console.log('handleDraw: 用户未登录'); // 调试日志
    Utils.UI.showToast('请先登录', 'warning');
    return;
  }

  console.log('--- 开始处理抽奖 ---');
  console.log('当前用户:', userInfo.username);

  // 获取当前积分
  const currentPoints = typeof getUserPoints === 'function'
    ? getUserPoints(userInfo.username)
    : (() => {
      const activities = Utils.DataManager.load('activities') || [];
      let total = 0;
      activities.forEach(activity => {
        if (activity.checkIns && Array.isArray(activity.checkIns)) {
          activity.checkIns.forEach(checkIn => {
            if (checkIn.username === userInfo.username) {
              total += activity.points || 0;
            }
          });
        }
      });
      return total;
    })();

  console.log('当前积分:', currentPoints);

  // 检查积分是否足够
  if (currentPoints < 20) {
    console.log('积分不足，显示提示'); // 调试日志
    showSimpleAlert('积分不足，无法参与抽奖');
    return;
  }

  console.log('积分足够，继续抽奖流程');

  // 获取奖品池数据
  const prizes = Utils.DataManager.load(PRIZES_STORAGE_KEY) || [];
  console.log('奖品池数据:', prizes);

  if (!prizes || prizes.length === 0) {
    console.log('奖品池为空'); // 调试日志
    showSimpleAlert('暂无奖品');
    return;
  }

  // 禁用抽奖按钮
  drawBtn.disabled = true;
  drawBtn.textContent = '抽奖中...';

  // 开始抽奖动画
  startDrawAnimation(prizes, () => {
    console.log('抽奖动画完成，开始抽奖'); // 调试日志
    try {
      // 动画结束后进行实际抽奖
      const result = drawPrize(prizes);
      console.log('抽奖结果:', result);

      if (result) {
        // 扣除20积分
        let pointsHistory = Utils.DataManager.load('pointsHistory') || {};
        if (!pointsHistory[userInfo.username]) {
          pointsHistory[userInfo.username] = [];
        }
        pointsHistory[userInfo.username].push({
          activityName: '幸运抽奖',
          points: -20,
          date: new Date().toISOString(),
          type: 'spent',
          status: 'completed',
          checkInStatus: 'checked'
        });
        Utils.DataManager.save('pointsHistory', pointsHistory);

        // 更新活动记录
        let activities = Utils.DataManager.load('activities') || [];
        let luckyDrawActivity = activities.find(a => a.id === 'LuckyDrawActivity');
        if (!luckyDrawActivity) {
          luckyDrawActivity = {
            id: 'LuckyDrawActivity',
            name: '幸运抽奖',
            points: -20,
            checkIns: []
          };
          activities.push(luckyDrawActivity);
        }
        luckyDrawActivity.checkIns.push({
          username: userInfo.username,
          checkInTime: new Date().toISOString()
        });
        Utils.DataManager.save('activities', activities);

        // 保存抽奖记录
        saveDrawHistory(result);
        // 显示抽奖结果
        showDrawResult(result);
      }

      // 刷新当前积分显示
      if (document.getElementById('currentPoints')) {
        const updatedPoints = typeof getUserPoints === 'function'
          ? getUserPoints(userInfo.username)
          : (() => {
            const activities = Utils.DataManager.load('activities') || [];
            let total = 0;
            activities.forEach(activity => {
              if (activity.checkIns && Array.isArray(activity.checkIns)) {
                activity.checkIns.forEach(checkIn => {
                  if (checkIn.username === userInfo.username) {
                    total += activity.points || 0;
                  }
                });
              }
            });
            return total;
          })();
        document.getElementById('currentPoints').textContent = updatedPoints;
      }
    } catch (error) {
      console.error('抽奖过程出错:', error);
      showSimpleAlert('抽奖失败，请重试');
    } finally {
      // 恢复抽奖按钮
      drawBtn.disabled = false;
      drawBtn.textContent = '开始抽奖/20积分';
    }
  });
}

// 新增：显示简洁提示框
function showSimpleAlert(message, duration = 1000) {
  const existingAlert = document.querySelector('.simple-alert');
  if (existingAlert) {
    existingAlert.remove(); // 移除已存在的提示框
  }

  const alertDiv = document.createElement('div');
  alertDiv.classList.add('simple-alert');
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  // 强制重绘，确保过渡动画生效
  void alertDiv.offsetWidth;

  alertDiv.classList.add('show');

  setTimeout(() => {
    alertDiv.classList.remove('show');
    // 等待过渡动画结束后移除元素
    alertDiv.addEventListener('transitionend', () => {
      alertDiv.remove();
    }, { once: true });
  }, duration);
}

// 3D盲盒动画
function start3DBoxAnimation(duration = 2000, callback) {
  const canvas = document.getElementById('box3dCanvas');
  const hint = document.getElementById('drawHint');
  const prizeDisplay = document.getElementById('prizeDisplay');
  // 隐藏提示，显示canvas
  if (hint) hint.style.display = 'none';
  canvas.style.display = 'block';
  prizeDisplay.querySelectorAll('img').forEach(img => img.remove());

  // three.js 场景
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(200, 200);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 4;

  // 立方体材质
  const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const material = new THREE.MeshStandardMaterial({ color: 0x4a90e2, metalness: 0.5, roughness: 0.3 });
  const box = new THREE.Mesh(geometry, material);
  scene.add(box);

  // 灯光
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(2, 2, 5);
  scene.add(light);

  // 动画
  let start = null;
  function animateBox(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    box.rotation.x += 0.04;
    box.rotation.y += 0.06;
    renderer.render(scene, camera);
    if (elapsed < duration) {
      requestAnimationFrame(animateBox);
    } else {
      // 清理three.js资源
      renderer.dispose && renderer.dispose();
      canvas.style.display = 'none';
      if (hint) hint.style.display = 'none';
      if (callback) callback();
    }
  }
  requestAnimationFrame(animateBox);
}

// 修改抽奖动画入口：点击抽奖时不暂停旋转，只显示"正在抽奖"，2秒后再执行抽奖逻辑
function startDrawAnimation(prizes, callback) {
  const drawBtn = document.getElementById('startDrawBtn');
  if (drawBtn) {
    drawBtn.textContent = '正在抽奖...';
    drawBtn.disabled = true;
  }

  // 加快盲盒旋转速度
  if (box3dBox) {
    const originalSpeed = 0.01;
    box3dBox.rotation.x += originalSpeed * 2;
    box3dBox.rotation.y += originalSpeed * 2;
  }

  // 2秒后执行抽奖
  setTimeout(() => {
    if (drawBtn) {
      drawBtn.textContent = '开始抽奖/20积分';
      drawBtn.disabled = false;
    }
    // 恢复盲盒旋转速度
    if (box3dBox) {
      box3dBox.rotation.x = 0.01;
      box3dBox.rotation.y = 0.01;
    }
    if (callback) {
      callback();
    }
  }, 2000);
}

// 根据概率抽取奖品
function drawPrize(prizes) {
  // 计算总概率
  const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);

  // 生成随机数
  const random = Math.random() * totalProbability;

  // 根据概率选择奖品
  let currentSum = 0;
  for (const prize of prizes) {
    currentSum += prize.probability;
    if (random <= currentSum) {
      return prize;
    }
  }

  // 如果没有选中任何奖品（理论上不会发生），返回最后一个奖品
  return prizes[prizes.length - 1];
}

// 显示抽奖结果
function showDrawResult(prize) {
  const resultModal = document.getElementById('resultModal');
  const resultImage = document.getElementById('resultImage');
  const resultName = document.getElementById('resultName');

  resultImage.innerHTML = `<img src="${prize.image}" alt="${prize.name}">`;
  resultName.textContent = prize.name;

  resultModal.style.display = 'flex';
}

// 关闭结果模态框
function closeResultModal() {
  const resultModal = document.getElementById('resultModal');
  resultModal.style.display = 'none';
}

// 获取奖品池数据
function getPrizes() {
  return Utils.DataManager.load(PRIZES_STORAGE_KEY) || [];
}

// 保存抽奖历史记录
function saveDrawHistory(prize) {
  const history = Utils.DataManager.load(DRAW_HISTORY_KEY) || [];
  const newRecord = {
    id: Date.now(),
    username: window.currentUser ? window.currentUser.username : 'unknown',
    prizeId: prize.id,
    prizeName: prize.name,
    timestamp: new Date().toISOString()
  };

  // 添加新记录到开头
  history.unshift(newRecord);
  Utils.DataManager.save(DRAW_HISTORY_KEY, history);
  loadDrawHistory(); // 刷新历史记录显示
}

// 加载抽奖历史记录
function loadDrawHistory() {
  const historyContainer = document.getElementById('drawHistory');
  const history = Utils.DataManager.load(DRAW_HISTORY_KEY) || [];
  const prizes = getPrizes(); // 获取奖品池数据
  const currentUser = window.currentUser;

  // 过滤出当前用户的历史记录
  const userHistory = history.filter(record => record.username === (currentUser ? currentUser.username : ''));

  // 获取用户抽奖次数
  const drawCount = userHistory.length;

  // 更新抽奖次数显示
  const drawCountElement = document.getElementById('drawCount');
  if (drawCountElement) {
    drawCountElement.textContent = drawCount;
  }

  if (userHistory.length === 0) {
    historyContainer.innerHTML = '<p class="text-muted">暂无抽奖记录</p>';
    return;
  }

  historyContainer.innerHTML = userHistory.map(record => {
    // 从奖品池中查找对应的奖品图片
    const prize = prizes.find(p => p.id == record.prizeId);
    const prizeImage = prize ? prize.image : '';

    return `
      <div class="history-item">
        <img src="${prizeImage}" alt="${record.prizeName}">
        <div>
          <div>${record.prizeName}</div>
          <small class="text-muted">${new Date(record.timestamp).toLocaleString()}</small>
        </div>
      </div>
    `;
  }).join('');
}

// 页面加载时渲染3D盲盒
function renderPrizeBox3D(prizes) {
  const canvas = document.getElementById('box3dCanvas');
  const hint = document.getElementById('drawHint');
  if (hint) hint.style.display = 'none';
  canvas.width = 320;
  canvas.height = 320;
  canvas.style.display = 'block';

  // 清理旧动画
  if (box3dAnimationId) cancelAnimationFrame(box3dAnimationId);

  // three.js 场景
  box3dRenderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  box3dRenderer.setSize(320, 320);
  box3dRenderer.setPixelRatio(window.devicePixelRatio);
  box3dRenderer.setClearColor(0x000000, 0); // 设置透明背景

  box3dScene = new THREE.Scene();
  box3dCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  box3dCamera.position.z = 5.2;

  // 六面贴图
  const images = prizes.slice(0, 6).map(p => p.image);
  while (images.length < 6) images.push(images[0] || '');

  const loader = new THREE.TextureLoader();
  const materials = images.map(img =>
    new THREE.MeshStandardMaterial({
      map: img ? loader.load(img) : null,
      color: img ? 0xffffff : 0x4a90e2,
      metalness: 0.2,
      roughness: 0.4,
      envMapIntensity: 1.0,
      transparent: true
    })
  );

  const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  box3dBox = new THREE.Mesh(geometry, materials);
  box3dScene.add(box3dBox);

  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  box3dScene.add(ambientLight);

  // 主光源
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(2, 2, 5);
  box3dScene.add(mainLight);

  // 补光
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-2, -1, -3);
  box3dScene.add(fillLight);

  // 动画
  let time = 0;
  function animate() {
    time += 0.02; // 加快时间流逝速度

    // 更快的旋转动画
    box3dBox.rotation.x = Math.sin(time * 0.5) * 0.1 + time * 0.4; // 加快x轴旋转
    box3dBox.rotation.y = Math.cos(time * 0.5) * 0.1 + time * 0.6; // 加快y轴旋转

    // 添加轻微的浮动效果
    box3dBox.position.y = Math.sin(time * 2) * 0.05;

    // 更新光源位置
    mainLight.position.x = Math.sin(time) * 3;
    mainLight.position.z = Math.cos(time) * 3;

    box3dRenderer.render(box3dScene, box3dCamera);
    box3dAnimationId = requestAnimationFrame(animate);
  }

  animate();

  // 添加鼠标交互
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = {
      x: e.clientX,
      y: e.clientY
    };
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };

    box3dBox.rotation.y += deltaMove.x * 0.01;
    box3dBox.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = {
      x: e.clientX,
      y: e.clientY
    };
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });
}

// 停止3D盲盒旋转
function stopPrizeBox3D() {
  if (box3dAnimationId) cancelAnimationFrame(box3dAnimationId);
}

// 添加一个新的函数来渲染带有指定图片的3D盲盒
function renderGiftBox3D() {
  box3dCanvas = document.getElementById('box3dCanvas');
  if (!box3dCanvas) {
    console.error('Canvas element not found!');
    return;
  }
  // 设置 Canvas 尺寸
  box3dCanvas.width = 320;
  box3dCanvas.height = 320;
  box3dCanvas.style.display = 'block'; // 显示 canvas

  const width = box3dCanvas.width;
  const height = box3dCanvas.height;

  // 初始化场景、相机和渲染器
  box3dScene = new THREE.Scene();
  box3dCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000); // 调整相机视角
  box3dRenderer = new THREE.WebGLRenderer({ canvas: box3dCanvas, antialias: true, alpha: true });
  box3dRenderer.setSize(width, height);
  box3dRenderer.setPixelRatio(window.devicePixelRatio); // 设置像素比
  box3dRenderer.setClearColor(0x000000, 0); // 设置透明背景

  // 创建盒子的几何体 (调整大小)
  const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2);

  // 加载纹理
  const textureLoader = new THREE.TextureLoader();
  const boxTexture = textureLoader.load('images/gift.jpg',
    // 加载成功回调
    function (texture) {
      // 创建材质，所有面使用同一纹理 (改为 MeshStandardMaterial)
      const material = new THREE.MeshStandardMaterial({
        map: texture, // 应用纹理
        metalness: 0.8, // 设置金属感，0到1，越高越像金属
        roughness: 0.2, // 设置粗糙度，0到1，越低越光滑，反射越清晰
        // envMap: environmentMap, // 如果有环境贴图可以加这里
      });
      const materials = new Array(6).fill(material);

      box3dBox = new THREE.Mesh(geometry, materials);
      box3dScene.add(box3dBox);

      // 调整盲盒的垂直位置，向上移动一丢丢
      box3dBox.position.y = 0.2; // 向上移动0.2个单位，根据需要调整这个值

      // 设置相机位置 (调整位置)
      box3dCamera.position.z = 5.2;

      // 添加灯光（提高亮度）
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 调整环境光强度
      box3dScene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.0); // 调整主光源强度
      mainLight.position.set(2, 2, 5);
      box3dScene.add(mainLight);

      // 开始动画
      animate();

      // 隐藏提示文本
      const drawHint = document.getElementById('drawHint');
      if (drawHint) {
        drawHint.style.display = 'none';
      }
    },
    // 加载进度回调
    undefined,
    // 加载失败回调
    function (err) {
      console.error('An error happened loading the texture:', err);
      // 显示备用内容或错误信息
      box3dCanvas.style.display = 'none';
      const drawHint = document.getElementById('drawHint');
      if (drawHint) {
        drawHint.textContent = '图片加载失败';
        drawHint.style.display = 'block';
      }
    }
  );

  // 动画循环
  function animate() {
    box3dAnimationId = requestAnimationFrame(animate);
    if (box3dBox) {
      box3dBox.rotation.x += 0.01; // 调整旋转速度 (加快)
      box3dBox.rotation.y += 0.01; // 调整旋转速度 (加快)
    }
    if (box3dRenderer && box3dScene && box3dCamera) {
      box3dRenderer.render(box3dScene, box3dCamera);
    }
  }

  // 添加鼠标交互 (从原函数复制)
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  box3dCanvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = {
      x: e.clientX,
      y: e.clientY
    };
  });

  box3dCanvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };

    box3dBox.rotation.y += deltaMove.x * 0.01;
    box3dBox.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = {
      x: e.clientX,
      y: e.clientY
    };
  });

  box3dCanvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  box3dCanvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });
}

// 停止3D盲盒动画 (如果需要)
function stopGiftBox3D() {
  if (box3dAnimationId) {
    cancelAnimationFrame(box3dAnimationId);
  }
  // 清理 Three.js 资源，防止内存泄露 (根据实际情况添加)
  if (box3dRenderer) {
    box3dRenderer.dispose();
    box3dRenderer = null;
  }
  if (box3dScene) {
    // 遍历场景中的对象并释放几何体和材质
    box3dScene.traverse(function (object) {
      if (object.isMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    box3dScene = null;
  }
  if (box3dCanvas) {
    const context = box3dCanvas.getContext('webgl');
    if (context) {
      context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
    }
    box3dCanvas.style.display = 'none'; // 隐藏 canvas
  }
  // 恢复提示文本
  const drawHint = document.getElementById('drawHint');
  if (drawHint) {
    drawHint.textContent = '点击抽奖按钮开始';
    drawHint.style.display = 'block';
  }
} 