# Cursor MCP 配置说明

## 配置选项

在 Cursor 中配置聚义厅 MCP 客户端，有以下几种方式：

### 1. NPX 远程包配置（推荐）

```json
{
  "mcpServers": {
    "juyiting": {
      "command": "npx",
      "args": ["-y", "juyiting-mcp-client"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. NPX 带配置文件

```json
{
  "mcpServers": {
    "juyiting": {
      "command": "npx",
      "args": [
        "-y", 
        "juyiting-mcp-client",
        "--config",
        "~/.juyiting/config.json"
      ],
      "env": {
        "NODE_ENV": "production",
        "JUYITING_CONFIG_PATH": "~/.juyiting/config.json"
      }
    }
  }
}
```

### 3. 全局安装后使用

首先全局安装：
```bash
npm install -g juyiting-mcp-client
```

然后配置：
```json
{
  "mcpServers": {
    "juyiting": {
      "command": "juyiting-mcp",
      "args": [],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 4. 本地开发配置

```json
{
  "mcpServers": {
    "juyiting": {
      "command": "node",
      "args": [
        "/path/to/juyiting/juyitingmcp/dist/server.js",
        "--debug"
      ],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  }
}
```

## 配置文件位置

Cursor 的 MCP 配置文件位置：
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.cursor-mcp/settings.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\rooveterinaryinc.cursor-mcp\settings.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/rooveterinaryinc.cursor-mcp\settings.json`

## 可用工具

配置成功后，聚义厅 MCP 客户端提供以下工具：

1. **summon_persona** - 召唤指定人格
2. **list_personas** - 列出所有可用人格
3. **search_personas** - 搜索人格

## 使用示例

配置完成后，在 Cursor 中可以这样使用：

```
请帮我召唤暴躁老哥来review我的代码
```

```
列出所有可用的人格角色
```

```
搜索和编程相关的人格
```

## 故障排除

### 1. 无法启动服务器
- 确保 Node.js 版本 >= 18
- 检查网络连接（需要访问远程人格数据）
- 查看 Cursor 的 MCP 日志

### 2. 找不到人格
- 确认网络连接正常
- 检查是否有本地人格配置文件
- 重启 Cursor 重新加载配置

### 3. 工具不可用
- 确认 MCP 服务器已正常启动
- 检查 Cursor MCP 插件是否启用
- 查看配置文件格式是否正确

## 最新版本

当前最新版本：1.0.2

更新命令：
```bash
npm update -g juyiting-mcp-client
```

或使用 npx 会自动获取最新版本。 