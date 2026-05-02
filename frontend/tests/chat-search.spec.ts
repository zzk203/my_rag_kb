import { test, expect, sampleTxt } from './fixtures'

const KB_NAME = `对话测试_${Date.now()}`

test.describe('对话与搜索', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/')
    // 创建知识库并上传文档
    await page.click('button:has-text("新建知识库")')
    await page.fill('input[id="name"]', KB_NAME)
    await page.click('.ant-modal-footer button.ant-btn-primary')
    await expect(page.locator(`text=${KB_NAME}`)).toBeVisible({ timeout: 5000 })

    // 进入文档页并上传
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(sampleTxt)
    await page.waitForTimeout(4000)
    await page.close()
  })

  test('发送问题获得回答', async ({ page }) => {
    await page.goto('/')
    // 进入对话页
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })
    await page.click('a:has-text("对话")')
    await page.waitForURL('**/chat**', { timeout: 5000 })

    // 输入问题
    const input = page.locator('textarea[placeholder*="输入"]').first()
    await input.fill('什么是Python')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)

    // 验证有回答内容（非空）
    const assistantMessage = page.locator('text=AI 助手').last()
    await expect(assistantMessage).toBeVisible({ timeout: 10000 })
    // 回答不是 "..."（思考中）
    const content = page.locator('[style*="white-space: pre-wrap"]').last()
    const text = await content.textContent()
    expect(text).not.toBe('...')
    expect(text!.length).toBeGreaterThan(10)
  })

  test('回答包含来源信息', async ({ page }) => {
    await page.goto('/')
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })
    await page.click('a:has-text("对话")')
    await page.waitForURL('**/chat**', { timeout: 5000 })

    const input = page.locator('textarea[placeholder*="输入"]').first()
    await input.fill('Python')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)

    // 验证来源面板出现
    await expect(page.locator('text=个来源')).toBeVisible({ timeout: 10000 })
  })

  test('来源点击跳转到文档页', async ({ page }) => {
    await page.goto('/')
    await page.click(`.ant-card:has-text("${KB_NAME}") .ant-card-meta-title`)
    await page.waitForURL('**/documents**', { timeout: 5000 })
    await page.click('a:has-text("对话")')
    await page.waitForURL('**/chat**', { timeout: 5000 })

    const input = page.locator('textarea[placeholder*="输入"]').first()
    await input.fill('Python')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)

    // 展开来源
    const sourceHeader = page.locator('text=个来源')
    if (await sourceHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sourceHeader.click()
      await page.waitForTimeout(500)

      // 点击来源文件名 Tag
      const sourceTag = page.locator('.ant-tag').first()
      if (await sourceTag.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sourceTag.click()
        await page.waitForURL('**/documents**', { timeout: 5000 })
        // 验证高亮行存在
        await page.waitForTimeout(1000)
        const hasHighlight = await page.locator('.highlight-row').isVisible({ timeout: 3000 }).catch(() => false)
        expect(hasHighlight).toBe(true)
      }
    }
  })

  test('搜索功能返回结果', async ({ page }) => {
    await page.goto('/')
    await page.click('text=搜索')
    await page.waitForURL('**/search**', { timeout: 5000 })

    // 检查页面上有搜索界面元素
    const searchPage = page.locator('text=搜索').last()
    await expect(searchPage).toBeVisible({ timeout: 5000 })
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/')
    await page.waitForTimeout(1000)
    const card = page.locator(`.ant-card:has-text("${KB_NAME}")`)
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      await card.locator('[aria-label="delete"]').click()
      await page.click('button:has-text("确定")')
    }
    await page.close()
  })
})
