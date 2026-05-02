import { test, expect } from './fixtures'

test.describe('知识库管理', () => {
  test('创建知识库', async ({ page }) => {
    const name = `create_${Date.now()}`
    await page.goto('/collections')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("新建知识库")')
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(name)
    await page.locator('.ant-modal textarea[placeholder="可选描述"]').fill('E2E测试用知识库')
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).toBeVisible({ timeout: 10000 })
    // 清理
    const card = page.locator(`.ant-card:has-text("${name}")`)
    await card.locator('[aria-label="delete"]').click()
    await page.waitForTimeout(500)
    await page.locator('.ant-popconfirm .ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).not.toBeVisible({ timeout: 5000 })
  })

  test('编辑知识库', async ({ page }) => {
    const name = `edit_${Date.now()}`
    // 先创建
    await page.goto('/collections')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("新建知识库")')
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(name)
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).toBeVisible({ timeout: 10000 })

    // 编辑
    const card = page.locator(`.ant-card:has-text("${name}")`)
    await card.locator('[aria-label="edit"]').click()
    const editedName = name + '_已编辑'
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(editedName)
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${editedName}")`)).toBeVisible({ timeout: 5000 })

    // 清理
    const editedCard = page.locator(`.ant-card:has-text("${editedName}")`)
    await editedCard.locator('[aria-label="delete"]').click()
    await page.waitForTimeout(500)
    await page.locator('.ant-popconfirm .ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${editedName}")`)).not.toBeVisible({ timeout: 5000 })
  })

  test('查看空知识库统计', async ({ page }) => {
    const name = `stats_${Date.now()}`
    await page.goto('/collections')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("新建知识库")')
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(name)
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).toBeVisible({ timeout: 10000 })

    const card = page.locator(`.ant-card:has-text("${name}")`)
    await expect(card.locator('.ant-statistic-content-value:has-text("0")').first()).toBeVisible({ timeout: 3000 })

    // 清理
    await card.locator('[aria-label="delete"]').click()
    await page.waitForTimeout(500)
    await page.locator('.ant-popconfirm .ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).not.toBeVisible({ timeout: 5000 })
  })

  test('删除知识库', async ({ page }) => {
    const name = `delete_${Date.now()}`
    await page.goto('/collections')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("新建知识库")')
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 })
    await page.locator('.ant-modal input[placeholder="知识库名称"]').fill(name)
    await page.locator('.ant-modal-footer button.ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).toBeVisible({ timeout: 10000 })

    // 删除
    const card = page.locator(`.ant-card:has-text("${name}")`)
    await card.locator('[aria-label="delete"]').click()
    await page.waitForTimeout(500)
    await page.locator('.ant-popconfirm .ant-btn-primary').click()
    await expect(page.locator(`.ant-card:has-text("${name}")`)).not.toBeVisible({ timeout: 5000 })
  })

  test('空列表展示', async ({ page }) => {
    await page.goto('/collections')
    await page.waitForLoadState('networkidle')
    // 先确保没有遗留知识库
    let deleteIcons = page.locator('[aria-label="delete"]')
    let deleteCount = await deleteIcons.count()
    while (deleteCount > 0) {
      await deleteIcons.first().click()
      await page.waitForTimeout(300)
      const confirmBtn = page.locator('.ant-popconfirm .ant-btn-primary')
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(1000)
      }
      await page.goto('/collections')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      deleteIcons = page.locator('[aria-label="delete"]')
      deleteCount = await deleteIcons.count()
    }
    await page.waitForTimeout(500)
    const cards = page.locator('.ant-card')
    const count = await cards.count()
    expect(count).toBe(0)
  })
})
