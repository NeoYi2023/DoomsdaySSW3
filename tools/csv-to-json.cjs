#!/usr/bin/env node
/**
 * CSV转JSON配置表转换工具
 * 用法: node tools/csv-to-json.js [输入目录] [输出目录]
 * 默认: node tools/csv-to-json.js configs/templates configs/json
 */

const fs = require('fs');
const path = require('path');

// 检测文件编码（简单检测UTF-8和GBK）
function detectEncoding(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    // 检查BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf-8';
    }
    // 简单检测：如果包含中文字符且不是UTF-8，可能是GBK
    // 这里简化处理，默认使用UTF-8，如果失败再尝试GBK
    return 'utf-8';
  } catch (e) {
    return 'utf-8';
  }
}

// 解析CSV文件
function parseCSV(filePath) {
  const encoding = detectEncoding(filePath);
  let content;
  
  try {
    if (encoding === 'gbk') {
      // 如果检测到GBK，需要使用iconv-lite
      try {
        const iconv = require('iconv-lite');
        const buffer = fs.readFileSync(filePath);
        content = iconv.decode(buffer, 'gbk');
      } catch (e) {
        // 如果没有iconv-lite，尝试直接读取
        content = fs.readFileSync(filePath, 'utf-8');
      }
    } else {
      content = fs.readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    console.error(`[错误] 无法读取文件: ${filePath}`, e.message);
    return null;
  }

  // 移除BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    console.warn(`[警告] 文件行数不足: ${filePath}`);
    return null;
  }

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  if (!headers || headers.length === 0) {
    console.warn(`[警告] 无法解析表头: ${filePath}`);
    return null;
  }

  // 解析数据行
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      row[header] = value.trim();
    });
    
    // 跳过所有字段都为空的行
    if (Object.values(row).every(v => !v)) continue;
    
    rows.push(row);
  }

  return rows;
}

// 解析CSV行（处理引号和逗号）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的双引号
        current += '"';
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// 转换数据类型
function convertValue(value, fieldName) {
  if (!value || value === '') return null;
  
  // 范围字段（如 "1|2" 或旧格式 "1-2"）- 优先处理，避免被其他规则匹配
  if (fieldName.includes('范围') && (value.includes('|') || value.includes('-')) && /^\d+[\|\-]\d+$/.test(value.trim())) {
    const [min, max] = value.split(/[\|\-]/).map(v => Number(v.trim()));
    return { min, max };
  }
  
  // 列表字段（使用竖线 | 分隔；兼容旧的逗号分隔）- 在数字字段之前处理，避免"数量"字段被误判
  if (fieldName.includes('列表') || fieldName.includes('ID列表') || 
      (fieldName.includes('规则') && fieldName.includes('ID')) ||
      fieldName.includes('棋盘出现内容')) {
    const sepRegex = /[,\|]/;
    if (sepRegex.test(value)) {
      return value.split(sepRegex).map(v => v.trim()).filter(v => v);
    } else if (value.trim()) {
      // 即使只有一个值，也返回数组
      return [value.trim()];
    }
  }
  
  // 数字字段（排除范围字段）
  if ((fieldName.includes('血量') || fieldName.includes('体力') || 
      fieldName.includes('攻击力') || fieldName.includes('等级') ||
      (fieldName.includes('数量') && !fieldName.includes('范围')) ||
      fieldName.includes('坐标') ||
      fieldName.includes('位置X') || fieldName.includes('位置Y') ||
      fieldName.includes('X坐标') || fieldName.includes('Y坐标') ||
      fieldName.includes('层数') || fieldName.includes('概率')) &&
      !fieldName.includes('范围')) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  
  // 布尔字段
  if (fieldName.includes('是否') || fieldName.includes('可') || 
      fieldName.toLowerCase().includes('bool') || 
      value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
  }
  
  // 通用范围字段检测（如果字段名不包含"范围"但值是范围格式，支持“1|2”或旧格式“1-2”）
  if ((value.includes('|') || value.includes('-')) && /^\d+[\|\-]\d+$/.test(value.trim()) && !fieldName.includes('列表')) {
    const [min, max] = value.split(/[\|\-]/).map(v => Number(v.trim()));
    return { min, max };
  }
  
  return value;
}

// 处理配置表数据
function processConfigData(rows, configType) {
  return rows.map(row => {
    const processed = {};
    for (const [key, value] of Object.entries(row)) {
      const converted = convertValue(value, key);
      if (converted !== null) {
        processed[key] = converted;
      }
    }
    return processed;
  });
}

// 主函数
function main() {
  const inputDir = process.argv[2] || path.join(__dirname, '..', 'configs', 'templates');
  const outputDir = process.argv[3] || path.join(__dirname, '..', 'configs', 'json');

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 配置表映射（物理文件名采用"英文名_中文名"形式，代码仅使用英文前缀）
  const configMap = {
    'EquipmentConfig_装备配置表.csv': 'EquipmentConfig.json',
    'ExplorerConfig_角色配置表.csv': 'ExplorerConfig.json',
    'TechTreeConfig_科技树配置表.csv': 'TechTreeConfig.json',
    'MonsterConfig_怪物配置表.csv': 'MonsterConfig.json',
    'MapConfig_地图配置表.csv': 'MapConfig.json',
    'ExplorationPointConfig_探索点配置表.csv': 'ExplorationPointConfig.json',
    'ResourceConfig_资源配置表.csv': 'ResourceConfig.json',
    'ItemConfig_道具配置表.csv': 'ItemConfig.json',
    'ShelterLevelConfig_避难所等级配置表.csv': 'ShelterLevelConfig.json',
    'GarbageConfig_垃圾配置表.csv': 'GarbageConfig.json',
    'AdvancedOutputConditionConfig_进阶产出机制配置表.csv': 'AdvancedOutputConditionConfig.json',
    'SkillConfig_技能配置表.csv': 'SkillConfig.json',
    'TalentConfig_天赋配置表.csv': 'TalentConfig.json',
    'LocalizationConfig_多语言配置表.csv': 'LocalizationConfig.json',
    'ShipConfig_勘探船配置表.csv': 'ShipConfig.json',
    'DefenseFacilityConfig_防御设施配置表.csv': 'DefenseFacilityConfig.json',
    'OreChoiceConfig_矿石选择配置表.csv': 'OreChoiceConfig.json'
  };

  // 特殊处理的配置表（非数组格式）
  const specialConfigs = ['LocalizationConfig_多语言配置表.csv'];

  console.log(`[CSV转JSON] 开始转换...`);
  console.log(`输入目录: ${inputDir}`);
  console.log(`输出目录: ${outputDir}\n`);

  let successCount = 0;
  let failCount = 0;

  // 处理每个配置表
  for (const [templateFile, jsonFile] of Object.entries(configMap)) {
    const templatePath = path.join(inputDir, templateFile);
    const jsonPath = path.join(outputDir, jsonFile);

    if (!fs.existsSync(templatePath)) {
      console.warn(`[跳过] 模板文件不存在: ${templateFile}`);
      continue;
    }

    console.log(`[处理] ${templateFile} -> ${jsonFile}`);

    try {
      const rows = parseCSV(templatePath);
      if (!rows || rows.length === 0) {
        console.warn(`[警告] ${templateFile} 没有有效数据`);
        failCount++;
        continue;
      }

      // 获取配置类型（从文件名提取）
      const configType = templateFile.replace('_template.csv', '');
      
      let outputData;
      
      // 多语言配置表特殊处理：转为 { key: { lang: text } } 格式
      if (specialConfigs.includes(templateFile)) {
        outputData = {};
        for (const row of rows) {
          const key = row['Key'];
          if (!key) continue;
          outputData[key] = {};
          for (const [field, value] of Object.entries(row)) {
            if (field !== 'Key' && value) {
              outputData[key][field] = value;
            }
          }
        }
      } else {
        outputData = processConfigData(rows, configType);
      }

      // 写入JSON文件
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(outputData, null, 2),
        'utf-8'
      );

      const recordCount = Array.isArray(outputData) ? outputData.length : Object.keys(outputData).length;
      console.log(`[成功] 已生成 ${jsonFile} (${recordCount} 条记录)`);
      successCount++;
    } catch (error) {
      console.error(`[错误] 处理 ${templateFile} 时出错:`, error.message);
      failCount++;
    }
  }

  console.log(`\n[完成] 成功: ${successCount}, 失败: ${failCount}`);
}

main();
