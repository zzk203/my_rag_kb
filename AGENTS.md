# AGENTS.md

## 快速开始

```bash
# 后端
cd backend
cp .env.example .env        # 编辑 KEY
pip install -r requirements.txt
rm -f data/knowledge.db      # schema 变更时需删除重建
uvicorn app.main:app --reload

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
- `highlight_text()` 用 `<mark>` 标签做关键词高亮。
- `IndexingService.cleanup_orphan_segments()` 读取 Chroma 内部 SQLite 的 `segments` 表清理孤儿目录。
- 创建知识库时 `llm_model` / `embedding_model` 留空自动继承 `.env` 的全局值，不保留硬编码默认值。
- LLM 与 Embedding 可配置不同 `provider`。Embedding 专属配置 (embedding_provider/api_key/base_url) 继承链为：**用户填写 → `.env` Embedding 专属 → `.env` LLM 配置**。
- `RELEVANCE_THRESHOLD = 0.05`（`qa_service.py`），过滤低于 `max_score * 5%` 的来源。
- LangChain 版本严格锁定 `langchain>=0.2.0,<0.3.0`。`langchain-ollama` 不是硬依赖，在代码中 `try/except ImportError` 可选导入。

### 测试

```bash
cd backend
rm -f data/knowledge.db && python test_api.py
```

- 使用 `fastapi.testclient.TestClient`，无 pytest。函数按执行顺序定义，`main()` 串行调用。
- upload 测试已跳过（BackgroundTasks 调用外部 API 导致 TestClient hang）。
- `Base.metadata.create_all(bind=engine)` 在 `from app.main import app` **之前**调用。

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
