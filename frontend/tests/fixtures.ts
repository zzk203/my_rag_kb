import { test as base, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 准备测试用文件
const UPLOAD_DIR = path.resolve(__dirname, 'test-files')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 创建测试文件
const sampleTxt = path.join(UPLOAD_DIR, 'sample.txt')
if (!fs.existsSync(sampleTxt)) {
  fs.writeFileSync(sampleTxt, '这是一份测试文档。\n包含Python编程相关内容。\nPython是一种高级编程语言。\n适用于数据分析、机器学习、Web开发等领域。\n')
}

const sampleMd = path.join(UPLOAD_DIR, 'sample.md')
if (!fs.existsSync(sampleMd)) {
  fs.writeFileSync(sampleMd, '# 神经网络简介\n\n神经网络是机器学习的一个重要分支。\n\n## 核心概念\n\n- 神经元\n- 激活函数\n- 反向传播\n')
}

const illegalExe = path.join(UPLOAD_DIR, 'test.exe')
if (!fs.existsSync(illegalExe)) {
  fs.writeFileSync(illegalExe, 'fake exe content')
}

// 侧边栏中选择知识库
export async function selectKnowledgeBase(page: Page, kbName: string) {
  // 点击侧边栏 Select 打开下拉菜单
  await page.locator('.ant-select').first().click()
  await page.waitForTimeout(500)
  // 精确选中下拉选项（不是已选中值）
  const option = page.locator(`.ant-select-item-option[title="${kbName}"]`)
  await option.waitFor({ state: 'visible', timeout: 5000 })
  await option.click()
  await page.waitForTimeout(500)
}

// 侧边栏导航到指定菜单
export async function navigateViaSidebar(page: Page, menuLabel: string, targetPath: string) {
  await page.locator(`.ant-menu-item:has-text("${menuLabel}")`).click()
  await page.waitForURL(`**${targetPath}`, { timeout: 5000 })
}

export const test = base.extend({
  // 可以在这里添加 fixture 逻辑，如自动创建/清理知识库
})

export { expect, sampleTxt, sampleMd, illegalExe }
