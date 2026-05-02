import { test, expect } from './fixtures'

const KB_NAME = `E2E测试知识库_${Date.now()}`

test.describe('知识库管理', () => {
  test('创建知识库', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("新建知识库")')
    await page.fill('input[id="name"]', KB_NAME)
    await page.fill('textarea[id="description"]', 'E2E测试用知识库')
    await page.click('.ant-modal-footer button.ant-btn-primary')
    await expect(page.locator(`text=${KB_NAME}`)).toBeVisible({ timeout: 5000 })
  })

  test('编辑知识库', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(`text=${KB_NAME}`)).toBeVisible({ timeout: 5000 })
    const card = page.locator(`.ant-card:has-text("${KB_NAME}")`)
    await card.locator('[aria-label="edit"]').click()
    await page.fill('input[id="name"]', KB_NAME + '_已编辑')
    await page.click('.ant-modal-footer button.ant-btn-primary')
    await expect(page.locator(`text=${KB_NAME}_已编辑`)).toBeVisible({ timeout: 5000 })
  })

  test('查看空知识库统计', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(`.ant-card:has-text("${KB_NAME}_已编辑")`)).toBeVisible({ timeout: 5000 })
    // 新知识库文档数和分块数应为 0
    const card = page.locator(`.ant-card:has-text("${KB_NAME}_已编辑")`)
    await expect(card.locator('.ant-statistic-content-value:has-text("0")').first()).toBeVisible({ timeout: 3000 })
  })

  test('删除知识库', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(`text=${KB_NAME}_已编辑`)).toBeVisible({ timeout: 5000 })
    const card = page.locator(`.ant-card:has-text("${KB_NAME}_已编辑")`)
    await card.locator('[aria-label="delete"]').click()
    await page.click('button:has-text("确定")')
    await expect(page.locator(`text=${KB_NAME}_已编辑`)).not.toBeVisible({ timeout: 5000 })
  })

  test('空列表展示', async ({ page }) => {
    await page.goto('/')
    // 等待卡片区域加载完毕
    await page.waitForTimeout(1000)
    const cards = page.locator('.ant-card')
    const count = await cards.count()
    // 预期没有知识库卡片（确保之前测试的都删完了）
    expect(count).toBe(0)
  })
})
