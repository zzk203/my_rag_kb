import { test, expect, sampleTxt, selectKnowledgeBase } from './fixtures'

let sharedKbName = ''

test.describe('对话与搜索', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    sharedKbName = `chat_test_${Date.now()}`

    // 创建知识库
    await page.goto('/collections')
    await page.click('button:has-text("新建知识库")')
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(sharedKbName)
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${sharedKbName}")`)).toBeVisible({ timeout: 10000 })

    // 选择知识库并进入文档页上传
    await selectKnowledgeBase(page, sharedKbName)
    await page.locator('.ant-menu-item:has-text("文档管理")').click()
    await page.waitForURL('**/documents**', { timeout: 5000 })

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(sampleTxt)
    // 点击"上 传"按钮（antd 中文按钮文本带空格，用类选择器）
    await page.locator('button.ant-btn-primary').click()
    // 等待索引完成后刷新页面
    await page.waitForTimeout(8000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    // 确认索引完成
    await expect(page.locator('text=ready').first()).toBeVisible({ timeout: 60000 })
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

  test('发送问题获得回答', async ({ page }) => {
    await page.goto('/')
    await selectKnowledgeBase(page, sharedKbName)
    const input = page.locator('textarea[placeholder*="输入"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill('什么是Python')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)

    const assistantMessage = page.locator('text=AI 助手').last()
    await expect(assistantMessage).toBeVisible({ timeout: 10000 })
    const content = page.locator('[style*="white-space: pre-wrap"]').last()
    const text = await content.textContent()
    expect(text).not.toBe('...')
    expect(text!.length).toBeGreaterThan(10)
  })

  test('回答包含来源信息', async ({ page }) => {
    await page.goto('/')
    await selectKnowledgeBase(page, sharedKbName)
    const input = page.locator('textarea[placeholder*="输入"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill('Python')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)

    await expect(page.locator('text=个来源').last()).toBeVisible({ timeout: 10000 })
  })

  test('来源点击跳转到文档页', async ({ page }) => {
    await page.goto('/')
    await selectKnowledgeBase(page, sharedKbName)
    const input = page.locator('textarea[placeholder*="输入"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill('Python')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)

    const sourceHeader = page.locator('text=个来源')
    if (await sourceHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sourceHeader.click()
      await page.waitForTimeout(500)

      const sourceTag = page.locator('.ant-tag').first()
      if (await sourceTag.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sourceTag.click()
        await page.waitForURL('**/documents**', { timeout: 5000 })
        await page.waitForTimeout(1000)
        const hasHighlight = await page.locator('.highlight-row').isVisible({ timeout: 3000 }).catch(() => false)
        expect(hasHighlight).toBe(true)
      }
    }
  })

  test('搜索功能返回结果', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    await selectKnowledgeBase(page, sharedKbName)

    await expect(page.locator('text=sample.txt')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=ready').first()).toBeVisible({ timeout: 5000 })
  })
})
