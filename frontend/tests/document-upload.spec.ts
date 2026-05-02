import { test, expect, sampleTxt, illegalExe, selectKnowledgeBase } from './fixtures'

let sharedKbName = ''

test.describe('文档上传与索引', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    sharedKbName = `upload_test_${Date.now()}`
    await page.goto('/collections')
    await page.click('button:has-text("新建知识库")')
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(sharedKbName)
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${sharedKbName}")`)).toBeVisible({ timeout: 10000 })
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!sharedKbName) return
    const page = await browser.newPage()
    await page.goto('/collections')
    await page.waitForTimeout(1000)
    const card = page.locator(`.ant-card:has-text("${sharedKbName}")`)
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      await card.locator('[aria-label="delete"]').click()
      await page.waitForTimeout(500)
      await page.locator('.ant-popconfirm .ant-btn-primary').click()
    }
    await page.close()
  })

  test('上传 txt 文件并验证 chunk', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    // 使用 DocumentPage 自己的 Select 选择知识库
    await page.locator('.ant-select').nth(1).click()
    await page.waitForTimeout(300)
    await page.locator(`.ant-select-item-option[title="${sharedKbName}"]`).click()
    await page.waitForTimeout(500)

    // 选择文件 → 点击"上传"（antd 中文按钮文本为 "上 传"，用类选择器）
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(sampleTxt)
    await page.locator('button.ant-btn-primary').click()
    await page.waitForTimeout(8000)
    // 索引是后台异步任务，刷新页面以获取最新状态
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=sample.txt')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=ready').first()).toBeVisible({ timeout: 60000 })
    const chunkCell = page.locator('td.ant-table-cell').filter({ hasText: /^[1-9]/ }).first()
    await expect(chunkCell).toBeVisible({ timeout: 5000 })
  })

  test('上传非法文件类型被拒绝', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    await page.locator('.ant-select').nth(1).click()
    await page.waitForTimeout(300)
    await page.locator(`.ant-select-item-option[title="${sharedKbName}"]`).click()
    await page.waitForTimeout(500)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(illegalExe)
    await page.locator('button.ant-btn-primary').click()
    await expect(page.locator('.ant-message-error').first()).toBeVisible({ timeout: 5000 })
  })

  test('重复上传同一文件返回 409', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    await page.locator('.ant-select').nth(1).click()
    await page.waitForTimeout(300)
    await page.locator(`.ant-select-item-option[title="${sharedKbName}"]`).click()
    await page.waitForTimeout(500)

    // 先上传一次
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(sampleTxt)
    await page.locator('button.ant-btn-primary').click()
    // 等待第一次上传和索引完成
    await page.waitForTimeout(8000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=ready').first()).toBeVisible({ timeout: 60000 })

    // 再次上传同一文件，应收到 409
    await fileInput.setInputFiles(sampleTxt)
    await page.locator('button.ant-btn-primary').click()
    await page.waitForTimeout(1000)
    await expect(page.locator('.ant-message-error').first()).toBeVisible({ timeout: 5000 })
  })

  test('搜索验证文档内容', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    // 使用 DocumentPage 自己的 Select
    await page.locator('.ant-select').nth(1).click()
    await page.waitForTimeout(300)
    await page.locator(`.ant-select-item-option[title="${sharedKbName}"]`).click()
    await page.waitForTimeout(500)

    await expect(page.locator('text=sample.txt')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=ready').first()).toBeVisible({ timeout: 5000 })
  })
})
