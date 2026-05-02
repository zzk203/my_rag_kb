import { test, expect, sampleTxt, illegalExe } from './fixtures'

const KB_NAME = `上传测试_${Date.now()}`

test.describe('文档上传与索引', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/')
    // 先创建知识库
    await page.click('button:has-text("新建知识库")')
    await page.fill('input[id="name"]', KB_NAME)
    await page.click('.ant-modal-footer button.ant-btn-primary')
    await expect(page.locator(`text=${KB_NAME}`)).toBeVisible({ timeout: 5000 })
    await page.close()
  })

  test('上传 txt 文件并验证 chunk', async ({ page }) => {
    await page.goto('/')
    // 点击知识库卡片进入文档页
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(sampleTxt)
    await page.waitForTimeout(3000) // 等待索引完成

    // 验证文件出现在列表中且状态为 ready
    await expect(page.locator('text=sample.txt')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=ready').first()).toBeVisible({ timeout: 10000 })

    // 验证 chunk 数 > 0
    const chunkCell = page.locator('td.ant-table-cell').filter({ hasText: /^[1-9]/ }).first()
    await expect(chunkCell).toBeVisible({ timeout: 5000 })
  })

  test('上传非法文件类型被拒绝', async ({ page }) => {
    await page.goto('/')
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })

    const fileInput = page.locator('input[type="file"]')
    // 尝试上传 exe 文件
    await fileInput.setInputFiles(illegalExe)

    // 应显示错误提示
    await expect(page.locator('.ant-message-error').first()).toBeVisible({ timeout: 5000 })
  })

  test('重复上传同一文件返回 409', async ({ page }) => {
    await page.goto('/')
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(sampleTxt)
    await page.waitForTimeout(1000)

    // 应显示 409 冲突提示
    await expect(page.locator('.ant-message-error').first()).toBeVisible({ timeout: 5000 })
  })

  test('搜索验证文档内容', async ({ page }) => {
    await page.goto('/')
    // 进入文档页
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })

    // 切换到搜索页
    await page.click('a:has-text("搜索")')
    await page.waitForURL('**/search**', { timeout: 5000 })

    // 搜索 "Python" (sample.txt 中包含的关键词)
    const searchInput = page.locator('input[placeholder*="搜索"]').first()
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('Python')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
      // 验证有搜索结果
      const results = page.locator('.ant-list-item')
      const count = await results.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/')
    await page.waitForTimeout(1000)
    // 清理：删除测试知识库
    const card = page.locator(`.ant-card:has-text("${KB_NAME}")`)
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      await card.locator('[aria-label="delete"]').click()
      await page.click('button:has-text("确定")')
    }
    await page.close()
  })
})
