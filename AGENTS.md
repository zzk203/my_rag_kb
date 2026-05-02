# AGENTS.md

## 快速开始

```bash
# 后端
cd backend
cp .env.example .env        # 编辑 KEY
pip install -r requirements.txt
rm -f data/knowledge.db      # schema 变更时需删除重建
uvicorn app.main:app --reload

# 后端 Debug 模式（输出性能计时日志）
DEBUG=true uvicorn app.main:app --reload --log-level debug

# 前端
cd frontend
npm install
npm run dev                  # Vite 代理 /api → localhost:8000

# Docker
docker compose up -d
```

## Python 3.8 兼容

- 系统 sqlite3 = 3.31，ChromaDB 要求 ≥ 3.35。
- `backend/app/__init__.py` 用 `pysqlite3-binary` 覆写 `sqlite3` 模块。
- 任何 `import chromadb` 之前必须执行此覆写。`test_api.py` 顶部也做了同样的覆写。
- test_api.py 在 import app 前设 fake env vars (`OPENAI_API_KEY`, `OPENAI_BASE_URL`)，不依赖真实 key。

## .env 加载

- `config.py` 通过绝对路径查找：`backend/.env` → 回退项目根目录。
- 运行目录不影响 .env 查找。

## 后端

- API 入口：`backend/app/main.py`，所有路由挂 `/api/v1` 前缀。
- 文档上传使用 FastAPI `BackgroundTasks` 异步索引，不阻塞响应。`schedule_indexing()` 传参给 `index_document_background`，后者必须使用独立 `SessionLocal()` 创建 session。
- Chroma collection 命名：`collection_{collection.id}`。
- **索引时必须将 `chunk.id`（DB 主键）写入 ChromaDB 元数据**（`split_doc.metadata["chunk_id"] = cr.id`），否则向量检索和关键词检索的 chunk_id 不匹配，RRF 融合会错乱。
- **检索结果必须查询 Document 表填充 filename**。ChromaDB 不存储文件名，`_vector_search` 需通过 `document_id` 回查 DB。
- **reindex 期间禁止重复操作**：文档 status 为 `processing` 时返回 409。reindex 接口同步将状态设为 `processing` 再调 BackgroundTasks，防止快速双击。
- RRF 融合默认常数 `k=60`。`_rrf_merge` 中 keyword 结果的 `items[cid]` 会覆盖 vector 结果的同名 chunk（因 keyword 后处理），RRF score 仅用于排序。
- **RRF 融合后会将融合分数写回 `r["score"]`**，覆盖原始分数。
- **检索方式必选**：创建知识库时 `search_type` 为必填项（`"hybrid"` / `"vector"` / `"keyword"`）。对话 API（`ChatRequest`）可通过 `search_type` 参数覆盖知识库默认值。优先级：请求参数 > 知识库配置 > `"hybrid"`。
- **相关性计算按检索方式分策略**（`qa_service.py:calc_relevance_pct`）：
  | 检索方式 | 分数范围 | 相关度公式 | 过滤阈值 |
  |----------|----------|------------|----------|
  | hybrid | RRF [0, ~0.033] | `min(score / 0.03279, 1.0) * 100` | score < 0.01 丢弃 |
  | vector | 余弦相似度 [0, 1] | `min(score, 1.0) * 100` | score < 0.3 丢弃 |
  | keyword | BM25 原始分（归一化到 [0,1]）| `min(score, 1.0) * 100` | 归一化后 < 0.05 丢弃 |
- **LLM 回复"知识库中未找到相关信息"时自动清空来源**：`qa_service.py` 在拿到 LLM 回答后检测该短语，若匹配则 `display_sources = []`，前端不展示任何来源。
- `highlight_text()` 用 `<mark>` 标签做关键词高亮。
- `IndexingService.cleanup_orphan_segments()` 读取 Chroma 内部 SQLite 的 `segments` 表清理孤儿目录。
- 创建知识库时 `llm_model` / `embedding_model` 留空自动继承 `.env` 的全局值，不保留硬编码默认值。
- LLM 与 Embedding 可配置不同 `provider`。Embedding 专属配置 (embedding_provider/api_key/base_url) 继承链为：**用户填写 → `.env` Embedding 专属 → `.env` LLM 配置**。
- **每次提问仅基于当前问题检索**，不再拼接历史对话（`max_history` 及对话历史拼接逻辑已全部移除）。`Collection` 模型中已无 `max_history` 字段。
- LangChain 版本严格锁定 `langchain>=0.2.0,<0.3.0`。`langchain-ollama` 不是硬依赖，在代码中 `try/except ImportError` 可选导入。

### 测试

```bash
cd backend
rm -f data/knowledge.db && python test_api.py
```

- 使用 `fastapi.testclient.TestClient`，无 pytest。函数按执行顺序定义，`main()` 串行调用。
- upload 测试已跳过（BackgroundTasks 调用外部 API 导致 TestClient hang）。
- `Base.metadata.create_all(bind=engine)` 在 `from app.main import app` **之前**调用。

### E2E 测试

```bash
cd frontend
npm run test:e2e                            # 终端运行 13 个用例
npm run test:e2e:ui                         # 可视化 UI 模式
npm run test:e2e:report                     # 查看 HTML 报告（含截图/视频）
```

- 使用 Playwright + Chromium，配置文件：`frontend/playwright.config.ts`。
- 测试自动启动后端（uvicorn + fresh DB）和前端（vite dev）作为 webserver。
- 覆盖：知识库 CRUD、文档上传（非法类型/重复检测）、搜索验证、对话问答、来源跳转高亮。
- fixtures.ts 自动在 `tests/test-files/` 创建测试用文件。

#### E2E 测试编写原则

**写选择器前必须先读组件源码**，而不是凭猜测试错。例如 `FileUpload.tsx` 中 "上传" 按钮是 Ant Design `<Button type="primary">上传</Button>`，理解了组件的 props（`loading`、`disabled`）和触发逻辑（`handleUpload`）后再写选择器。

具体注意事项：

| 问题 | 说明 |
|------|------|
| **Ant Design 5 中文按钮文本带空格** | `Button` 的子文本 "上传" 在 DOM 中变为 "上 传"（双汉字自动插入空格）。不要用 `button:has-text("上传")`，用 `button.ant-btn-primary` 或 `getByRole('button', { name: /上/ })` |
| **FileUpload 两步操作** | 组件有两个独立按钮："选择文件"（打开文件对话框）+ "上传"（`handleUpload` 发 API）。`page.locator('input[type="file"]').setInputFiles()` 只模拟选文件，**不会自动上传**，必须再点 "上传" 按钮 |
| **`text=` 选择器 strict mode** | 侧边栏 Select 的已选值和 CollectionPage 卡片都包含 KB 名称文本，`page.locator(\`text=${name}\`)` 会匹配 2 个元素触发 strict mode 违规。用 `.ant-card:has-text("${name}")` 限定范围 |
| **页面状态不会自动刷新** | 文档索引是异步后台任务，`upload` API 返回后索引可能还在进行中。等 `text=ready` 之前先 `page.reload()` + `waitForLoadState('networkidle')` |
| **后端 `reuseExistingServer: false`** | 每次测试 run 必须重启后端（`rm -f knowledge.db` 配合 fresh uvicorn），否则 DB 被删但旧进程还在用失效的 SQLite 连接池，导致 500 |

**调试技巧**：当选择器找不到元素时，用 `page.content()` dump 完整 HTML 搜索目标文本，或循环 `page.locator('button').all()` 打印所有按钮的 `textContent()`。

## 性能与缓存

- **BM25 缓存**：`retrieval_service.py` 模块级全局字典（`_bm25_cache: Dict[int, BM25Retriever]`），首次检索时构建，后续复用。BM25Retriever 内部持有文档列表和 vectorizer。索引/删除时通过 `invalidate_bm25_cache(collection_id)` 刷新。
- **BM25 实现**：使用 `langchain_community.retrievers.BM25Retriever`（底层依赖 `rank_bm25`），通过 `preprocess_func=_tokenize` 传入 jieba 中文分词。查询时通过 `retriever.vectorizer.get_scores()` 获取原始 BM25 分数，在 `_filter_and_rank` 中归一化到 [0,1]。
- **向量存储缓存**：`retrieval_service.py` 模块级全局字典（`_vectorstore_cache`），避免每次检索重新创建 Chroma/Embeddings 对象。索引/删除时通过 `invalidate_vectorstore_cache(collection_id)` 刷新。
- **模型单例**：Docling `DocumentConverter` 和 EasyOCR `Reader` 改为模块级单例（双重检查锁），避免每次解析重加载模型。
- **DB 索引**：`documents.collection_id`、`chunks.document_id`、`conversations.collection_id`、`messages.conversation_id` 均设 `index=True`，Documents 增加复合索引 `idx_collection_filehash`。
- **批量 DELETE**：删除知识库时消息清理使用 `in_()` 批量操作，避免 N+1。
- **中文分词**：BM25 使用 jieba 分词（`_tokenize()`），若未安装 `jieba>=0.42` 会**静默回退到 `str.split()`**，导致中文文本无空格被当成单一 token，BM25 检索完全失效（所有查询得分为 0）。务必确保 jieba 已安装。

## 安全

- **API Key 不泄露**：`CollectionOut` schema 不包含 `api_key`/`embedding_api_key`/`base_url`，仅返回 `has_custom_key`/`has_embedding_key` 布尔标记。
- **SSRF 防护**：`utils/url_validator.py` 校验 base_url 目标地址，拦截 localhost 和内网 IP 段（10/172/192/169.254/127/0.0.0.0）。
- **CORS**：`allow_origins` 从 `CORS_ORIGINS` 环境变量读取（默认 `http://localhost:3000`），禁止 `*`。
- **文件上传校验**：扩展名白名单（`DoclingParser.SUPPORTED_EXTENSIONS`）+ 50MB 大小限制（`MAX_FILE_SIZE`）。
- **错误脱敏**：索引失败和对话异常不再返回原始 `str(e)`，改为通用错误文案 + `logging.exception` 内部记录。
- **Pydantic 约束**：Schema 增加 `Field(min_length/max_length)` 和 `Literal` 白名单限制输入。

## 前端

- React 18 + Vite + TypeScript + Ant Design 5
- API 封装在 `src/api/`（axios 拦截器处理 FastAPI 422 detail 数组）
- Zustand 全局状态在 `src/store/`
- 上传用原生 `<input type="file">`，**不要用 Ant Design Upload**（beforeUpload 的 RcFile 无 originFileObj 取不到文件）

### 构建

```bash
cd frontend
npx tsc --noEmit            # 类型检查（noUnusedLocals=false，宽松）
npx vite build              # 生产构建（package.json 中 build = tsc && vite build）
```
