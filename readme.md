# PixelDraw

### 如何部署

1. 克隆本仓库到本地  
   ```bash
   git clone https://github.com/JessDaodao/PixelDraw
   cd PixelDraw
   ```

2. 安装依赖  
   ```bash
   npm install express socket.io
   ```

3. 启动服务器  
   ```bash
   npm start
   ```

4. 在浏览器访问  
   [http://localhost:3000](http://localhost:3000)

### 配置文件

```json
// 以下注释仅作参考用，切勿将注释填入项目的真实配置文件
// json不支持注释！！！
{
    // 服务端监听端口
    "port": 3000,
    // 网站标题
    "siteTitle": "PixelDraw",
    // 网站图标
    "siteIcon": "img/icon.png",
    // 公告窗口标题
    "broadcastTitle": "公告",
    // 画板宽度
    "boardWidth": 800,
    // 画板高度
    "boardHeight": 500,
    // 最小缩放比例
    "minZoom": 0.5,
    // 最大缩放比例
    "maxZoom": 20,
    // 用户关闭窗口后像素限制会在多久后重置（分钟）
    "rateLimitWindow": 10,
    // 每个用户的最大像素数
    "maxPixelsPerWindow": 100,
    // 自动保存间隔（分钟）
    "autoSaveInterval": 5,
    // 是否启用备份
    "enableBackup": true,
    // 最大备份数
    "maxBackups": 5,
    // 是否启用活动时间限制
    "enableTimeLimit": false,
    // 活动开始时间
    "timeLimitStart": "2026-01-01 00:00",
    // 活动结束时间
    "timeLimitEnd": "2026-03-01 00:00",
    // 是否启用基于画板的倒计时
    "enablePixelCountdown": false,
    // 画板倒计时位置
    // 可用参数：top-right, top-left, bottom-right, bottom-left, center
    "pixelCountdownPosition": "top-right",
    // 画板倒计时颜色
    "pixelCountdownColor": "#666666ff",
    // 画板倒计时字体大小
    "pixelCountdownFontSize": 12,
    // 画板倒计时水平偏移量
    "pixelCountdownOffsetX": 0,
    // 画板倒计时垂直偏移量
    "pixelCountdownOffsetY": 0,
    // 管理员密码（随机生成）
    "adminPassword": "50XHDMEY",
    // 最大登录尝试次数
    "adminMaxAttempts": 5,
    // 登录失败后的冷却时间（分钟）
    "adminCooldownMinutes": 5
}
```