#!/usr/bin/env node

/**
 * 配置同步器使用示例
 * 展示如何使用ConfigSynchronizer进行配置管理
 */

import { ConfigSynchronizer } from '../dist/config-synchronizer.js';

async function demonstrateConfigSync() {
  console.log('🚀 配置同步器功能演示\n');

  // 1. 创建配置同步器实例
  const configSync = new ConfigSynchronizer();
  console.log('✅ 配置同步器已创建');

  // 2. 检查初始状态
  console.log('\n📊 初始同步状态:');
  const initialStatus = configSync.getSyncStatus();
  console.log(`- 认证状态: ${initialStatus.isConfigured ? '已配置' : '未配置'}`);
  console.log(`- 当前配置: ${initialStatus.hasCurrentConfig ? '已激活' : '无活跃配置'}`);
  console.log(`- 自动同步: ${initialStatus.autoSyncEnabled ? '已启用' : '已禁用'}`);
  console.log(`- API地址: ${initialStatus.apiBaseUrl}`);

  // 3. 设置用户密钥（演示用，实际使用时需要真实的密钥）
  console.log('\n🔑 设置用户密钥...');
  try {
    // 注意：这里使用演示密钥，实际使用时需要从聚义厅平台获取
    await configSync.setUserKey('demo_user_key_123456');
    console.log('✅ 用户密钥设置成功');
  } catch (error) {
    console.log(`❌ 设置用户密钥失败: ${error.message}`);
  }

  // 4. 尝试列出远程配置（演示网络请求处理）
  console.log('\n📋 获取远程配置列表...');
  try {
    const configs = await configSync.listRemoteConfigs();
    console.log(`✅ 找到 ${configs.length} 个配置:`);
    configs.forEach((config, index) => {
      console.log(`  ${index + 1}. ${config.name} (${config.id})`);
      console.log(`     人格: ${config.personas.join(', ')}`);
      console.log(`     版本: ${config.version}`);
    });
  } catch (error) {
    console.log(`❌ 获取配置列表失败: ${error.message}`);
    console.log('💡 这是预期的，因为使用了演示密钥');
  }

  // 5. 演示配置下载（模拟）
  console.log('\n📦 配置下载演示...');
  try {
    // 这里会失败，因为使用演示密钥
    const config = await configSync.downloadConfig('demo-config-001');
    console.log(`✅ 配置下载成功: ${config.name}`);
  } catch (error) {
    console.log(`❌ 配置下载失败: ${error.message}`);
    console.log('💡 这是预期的，因为使用了演示密钥和演示配置ID');
  }

  // 6. 查看最终状态
  console.log('\n📊 最终同步状态:');
  const finalStatus = configSync.getSyncStatus();
  console.log(`- 认证状态: ${finalStatus.isConfigured ? '已配置' : '未配置'}`);
  console.log(`- 当前配置: ${finalStatus.hasCurrentConfig ? '已激活' : '无活跃配置'}`);
  console.log(`- 最后同步: ${finalStatus.lastSyncTime || '从未同步'}`);

  // 7. 缓存管理演示
  console.log('\n🗂️ 缓存管理演示...');
  console.log('清除缓存...');
  configSync.clearCache();
  console.log('✅ 缓存已清除');

  // 8. 清理资源
  console.log('\n🧹 清理资源...');
  configSync.destroy();
  console.log('✅ 配置同步器已销毁');

  console.log('\n🎉 演示完成！');
  console.log('\n📖 使用说明:');
  console.log('1. 在聚义厅Web平台注册并获取userKey');
  console.log('2. 使用 setUserKey() 设置认证密钥');
  console.log('3. 使用 listRemoteConfigs() 查看可用配置');
  console.log('4. 使用 syncFromRemote() 下载并激活配置');
  console.log('5. 配置会自动保存到 ~/.juyiting/config.json');
}

// 错误处理包装
async function main() {
  try {
    await demonstrateConfigSync();
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 