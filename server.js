const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.text());

// 保存shell脚本的API端点
app.post('/api/save-shell-script', (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '脚本内容不能为空' });
    }
    
    // 将脚本内容保存到shell.sh文件
    const scriptPath = path.join(__dirname, 'shell.sh');
    fs.writeFileSync(scriptPath, content, 'utf8');
    
    console.log('Shell脚本已保存到:', scriptPath);
    res.json({ 
      success: true, 
      message: '脚本保存成功',
      path: scriptPath
    });
  } catch (error) {
    console.error('保存shell脚本失败:', error);
    res.status(500).json({ error: '保存脚本失败: ' + error.message });
  }
});

// 执行shell脚本的API端点
app.post('/api/execute-shell', (req, res) => {
  try {
    const shellContent = req.body;
    
    if (!shellContent || typeof shellContent !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Shell内容不能为空' 
      });
    }

    // 创建临时shell.sh文件
    const shellFilePath = path.join(__dirname, 'temp_shell.sh');
    
    // 写入shell内容到文件
    fs.writeFileSync(shellFilePath, shellContent, 'utf8');
    
    // 在Windows上使用Git Bash或WSL执行shell脚本
    // 如果是Windows系统，尝试使用bash命令
    const isWindows = process.platform === 'win32';
    const command = isWindows ? `bash "${shellFilePath}"` : `chmod +x "${shellFilePath}" && "${shellFilePath}"`;
    
    exec(command, { 
      cwd: __dirname,
      timeout: 30000, // 30秒超时
      maxBuffer: 1024 * 1024 // 1MB缓冲区
    }, (error, stdout, stderr) => {
      // 清理临时文件
      try {
        fs.unlinkSync(shellFilePath);
      } catch (cleanupError) {
        console.warn('清理临时文件失败:', cleanupError.message);
      }
      
      if (error) {
        console.error('Shell执行错误:', error);
        return res.json({
          success: false,
          error: error.message,
          stderr: stderr,
          stdout: stdout
        });
      }
      
      res.json({
        success: true,
        stdout: stdout,
        stderr: stderr,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误: ' + error.message
    });
  }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: process.platform
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Shell执行服务器运行在 http://localhost:${PORT}`);
  console.log(`平台: ${process.platform}`);
  console.log('API端点:');
  console.log(`  POST /api/execute-shell - 执行shell脚本`);
  console.log(`  GET  /api/health - 健康检查`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});