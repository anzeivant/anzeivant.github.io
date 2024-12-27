let scene, camera, renderer;
let particles = [];
let data = [];
let selectedYear = 2016; // 默认选择年份为2016

// 初始化Three.js场景
function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('particles-container').appendChild(renderer.domElement);

  camera.position.z = 300;
}

// 加载并读取文件
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    Papa.parse(text, {
      complete: function (results) {
        data = results.data; // 获取解析后的数据
        console.log("CSV Data Loaded:", data);
        updateYearSelect(); // 成功加载后更新年份选择框
        filterAndCreateParticles(selectedYear); // 根据默认年份筛选数据并创建粒子
      },
      header: true, // 第一行作为标题行
      skipEmptyLines: true // 跳过空行
    });
  };
  reader.readAsText(file); // 读取文件内容
}

// 更新年代选择框
function updateYearSelect() {
  const years = Array.from(new Set(data
    .filter(d => d.track_album_release_date)
    .map(d => d.track_album_release_date.split('/')[0])
    .filter(year => year)
  ));

  const yearSelect = document.getElementById('year-select');
  yearSelect.innerHTML = '';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  yearSelect.value = selectedYear;
  yearSelect.addEventListener('change', (event) => {
    selectedYear = event.target.value;
    filterAndCreateParticles(selectedYear);
  });
}

// 根据年份筛选数据并创建粒子
function filterAndCreateParticles(year) {
  const filteredData = data.filter(d => d.track_album_release_date.startsWith(year));
  console.log("Filtered Data for Year", year, ": ", filteredData);
  createParticles(filteredData);
}

// 创建粒子
function createParticles(data) {
  particles.forEach(p => scene.remove(p));
  particles = [];

  data.forEach(d => {
    const particle = createParticle(d);
    particles.push(particle);
    scene.add(particle);
  });
}

// 创建单个粒子
function createParticle(d) {
  const size = d.track_popularity / 15;
  let geometry;
switch (d.playlist_genre.toLowerCase()) {
  case 'pop':
    geometry = new THREE.SphereGeometry(size, 16, 16);
    break;
  case 'rap':
    geometry = new THREE.BoxGeometry(size, size, size);
    break;
  case 'rock':
    geometry = new THREE.ConeGeometry(size, size, 3); // 三棱锥
    break;
  case 'latin':
    geometry = new THREE.OctahedronGeometry(size);
    break;
  case 'r&b':
    geometry = new THREE.CylinderGeometry(size, size,size, 16);
    break;
  case 'edm':
    geometry = new THREE.DodecahedronGeometry(size);
    break;
  default:
    geometry = new THREE.SphereGeometry(size, 16, 16); // 默认形状
    break;
}


  const material = new THREE.MeshBasicMaterial({
    color: getColorForParticle(d),
    transparent: true,
    opacity: 1
  });

  const particle = new THREE.Mesh(geometry, material);
  const speed = d.tempo / 200;

  // 粒子随机生成在整个屏幕范围
  particle.position.set(
    Math.random() * window.innerWidth - window.innerWidth / 2, // X 轴范围
    Math.random() * window.innerHeight - window.innerHeight / 2, // Y 轴范围
    Math.random() * 100 - 50 // Z 轴范围
  );
  particle.userData = {
    speed: speed * 1.5,
    frequency: d.danceability * 0.05,
    amplitude: d.loudness * 0.1,
    drift: d.energy > 0.5 ? 0.5 : -0.5,
    valence: d.valence
  };

  return particle;
}

// 获取粒子颜色
function getColorForParticle(d) {
  // 根据 danceability 分区间分类（决定主色调）
  let color;
  if (d.danceability < 0.3) {
    // 低 danceability：冷色调
    if (d.energy > 0.7) {
      color = 'rgb(0, 0, 255)'; // 蓝色
    } else {
      color = 'rgb(128, 0, 128)'; // 紫色
    }
  } else if (d.danceability < 0.6) {
    // 中等 danceability：过渡色调
    if (d.valence > 0.5) {
      color = 'rgb(255, 255, 0)'; // 黄色
    } else {
      color = 'rgb(0, 255, 255)'; // 青色
    }
  } else {
    // 高 danceability：暖色调
    if (d.tempo > 120) {
      color = 'rgb(255, 165, 0)'; // 橙色
    } else {
      color = 'rgb(255, 0, 0)'; // 红色
    }
  }

  return new THREE.Color(color);
}



// 动画渲染函数
function animate() {
  requestAnimationFrame(animate);

  particles.forEach(particle => {
    const userData = particle.userData;

    // 更新位置：沿 x 方向直线加正弦波运动，逐渐偏移
    particle.position.x += userData.speed;
    particle.position.y += Math.sin(particle.position.x * userData.frequency) * userData.amplitude + userData.drift * 0.01;
    particle.material.opacity -= 0.001 * userData.valence;

    // 超出右边界或完全透明时复位
    if (particle.position.x > 500 || particle.material.opacity <= 0) {
      resetParticle(particle);
    }
  });

  renderer.render(scene, camera);
}

function resetParticle(particle) {
  // 随机生成新位置
  particle.position.set(
    Math.random() * window.innerWidth - window.innerWidth / 2, // X 轴范围
    Math.random() * window.innerHeight - window.innerHeight / 2, // Y 轴范围
    Math.random() * 100 - 50 // Z 轴范围
  );
  
  // 重置透明度
  particle.material.opacity = 1;
}


// 初始化并启动
function init() {
  initThree();

  const fileInput = document.getElementById('file-upload');
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      loadFile(file);
    }
  });

  animate();
}

init();
