import {
  BulbOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  FileAddOutlined,
  FireOutlined,
  SendOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Divider,
  Empty,
  Input,
  List,
  message,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { type ReactNode, useMemo, useState } from 'react'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

const FRAMEWORK_OPTIONS = [
  { label: 'React / Next.js', value: 'react' },
  { label: 'Vue 3', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: '组件库 / 样式系统', value: 'css' },
  { label: '其他', value: 'general' },
]

const CHECKPOINTS = [
  '状态管理与数据流',
  '可访问性 (a11y)',
  '性能 & 体积',
  '样式与设计体系',
  '可读性与可维护性',
  '错误处理与异常边界',
]

const PRESET_SNIPPETS = [
  {
    id: 'react-form',
    title: 'React 表单组件',
    framework: 'react',
    code: `import { useState } from 'react'
import './Form.css'

export function ProfileForm() {
  const [form, setForm] = useState({ name: '', email: '', agree: false })

  function update(key: keyof typeof form, value: string | boolean) {
    setForm({ ...form, [key]: value })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    fetch('/api/profile', {
      method: 'POST',
      body: JSON.stringify(form),
    })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={form.name} onChange={(event) => update('name', event.target.value)} />
      </label>
      <label>
        Email
        <input value={form.email} onChange={(event) => update('email', event.target.value)} />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(event) => update('agree', event.target.checked)}
        />
        I agree to receive newsletters
      </label>
      <button type="submit">保存</button>
    </form>
  )
}`,
    context: '组件用于个人信息编辑，需要考虑移动端和可访问性。',
  },
  {
    id: 'vue-table',
    title: 'Vue 表格渲染',
    framework: 'vue',
    code: `<script setup lang="ts">
import { onMounted, ref } from 'vue'

const rows = ref([])

onMounted(async () => {
  const resp = await fetch('/api/users')
  rows.value = await resp.json()
})
</script>

<template>
  <table class="user-table">
    <tr v-for="item in rows" :key="item.id">
      <td>{{ item.name }}</td>
      <td>{{ item.email }}</td>
      <td>
        <button @click="$emit('open', item)">Open</button>
      </td>
    </tr>
  </table>
</template>`,
    context: '需要支持空状态、高亮行、以及 5k+ 行的性能优化。',
  },
]

const DEFAULT_CODE = PRESET_SNIPPETS[0].code

const API_ENDPOINT = import.meta.env.VITE_MASTRA_API_URL + '/api/review'

type ReviewRecord = {
  id: string
  createdAt: string
  summary: string
}

const markdownComponents = {
  h1: ({ children }: { children: ReactNode }) => <Title level={3}>{children}</Title>,
  h2: ({ children }: { children: ReactNode }) => <Title level={4}>{children}</Title>,
  h3: ({ children }: { children: ReactNode }) => <Title level={5}>{children}</Title>,
  p: ({ children }: { children: ReactNode }) => (
    <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{children}</Paragraph>
  ),
}

const Home = () => {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [framework, setFramework] = useState<string>('react')
  const [context, setContext] = useState('')
  const [filename, setFilename] = useState('Form.tsx')
  const [report, setReport] = useState<string | null>(null)
  const [history, setHistory] = useState<ReviewRecord[]>([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const summaryFromReport = (text: string) => {
    const firstLine = text.split('\n').find((line) => line.trim().length > 0)
    return firstLine ?? '新的评审'
  }

  const handleReview = async () => {
    if (!code.trim()) {
      messageApi.warning('请先粘贴需要评审的代码。')
      return
    }

    setIsReviewing(true)
    setReport(null)
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          context,
          filename,
          framework,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || '评审失败')
      }

      setReport(result.report)
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          summary: summaryFromReport(result.report),
        },
        ...prev.slice(0, 4),
      ])
      messageApi.success('评审已生成')
    } catch (error) {
      console.error(error)
      messageApi.error('评审失败，请稍后再试。')
    } finally {
      setIsReviewing(false)
    }
  }

  const activeHints = useMemo(
    () =>
      CHECKPOINTS.map((item) => ({
        label: item,
        icon: <CheckCircleOutlined />,
      })),
    [],
  )

  const applyPreset = (presetId: string) => {
    const target = PRESET_SNIPPETS.find((item) => item.id === presetId)
    if (!target) return
    setFramework(target.framework)
    setContext(target.context || '')
    setCode(target.code)
    setFilename(target.framework === 'vue' ? 'Table.vue' : 'Component.tsx')
    messageApi.success(`已载入示例：${target.title}`)
  }

  return (
    <div className="review-app">
      {contextHolder}
      <header className="hero">
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            前端代码评审助手
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            粘贴组件或页面源码，由 AI 生成结构化的代码审查建议，覆盖性能、可访问性、可维护性等维度。
          </Paragraph>
        </div>
        <Space>
          <Tag icon={<FireOutlined />} color="blue">
            React
          </Tag>
          <Tag icon={<FireOutlined />} color="green">
            Vue
          </Tag>
          <Tag icon={<FireOutlined />} color="purple">
            Web Components
          </Tag>
        </Space>
      </header>

      <main className="review-layout">
        <section className="panel input-panel">
          <div className="panel-header">
            <CodeOutlined />
            <span>粘贴需要评审的代码</span>
          </div>
          <div className="panel-body">
            <Space direction="vertical" size="middle" style={{ width: '100%',flex: 1 }}>
              <Space direction="horizontal" size="middle" wrap>
                <Select
                  value={framework}
                  onChange={setFramework}
                  options={FRAMEWORK_OPTIONS}
                  style={{ minWidth: 200 }}
                />
                <Input
                  placeholder="可选：代码文件名"
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                />
              </Space>
              <TextArea
                className="code-input"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                placeholder="在此粘贴需要评审的前端代码片段……"
              />
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="可选：补充背景信息（例如：业务上下文、遗留限制、性能目标等）"
              />
              <Space>
                <Button icon={<FileAddOutlined />} onClick={() => applyPreset('react-form')}>
                  React 示例
                </Button>
                <Button icon={<FileAddOutlined />} onClick={() => applyPreset('vue-table')}>
                  Vue 示例
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  size="large"
                  loading={isReviewing}
                  onClick={handleReview}
                >
                  {isReviewing ? '正在评审…' : '生成评审建议'}
                </Button>
              </Space>

            </Space>
          </div>
          <div className="insight-section">
            <div className="section-title">
              <BulbOutlined />
              <span>评审关注点</span>
            </div>
            <div className="insight-grid">
              {activeHints.map((item) => (
                <Tag key={item.label} icon={item.icon} color="geekblue">
                  {item.label}
                </Tag>
              ))}
            </div>
          </div>
        </section>

        <section className="panel output-panel">
          <div className="panel-header">
            <SendOutlined />
            <span>评审结果</span>
          </div>
          <div className="panel-body report-panel">
            {isReviewing ? (
              <div className="report-placeholder">
                <Spin tip="AI 正在阅读代码…" />
              </div>
            ) : report ? (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                  {report}
                </ReactMarkdown>
              </div>
            ) : (
              <Empty
                description={
                  <span>
                    尚未生成报告。粘贴代码后点击 <strong>生成评审建议</strong>。
                  </span>
                }
              />
            )}
          </div>

          <Divider />
          <div className="history-section">
            <div className="section-title">
              <HistoryTimelineIcon />
              <span>最近评审</span>
            </div>
            {history.length === 0 ? (
              <Paragraph type="secondary">暂无记录。</Paragraph>
            ) : (
              <List
                size="small"
                dataSource={history}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={0}>
                      <Text>{item.summary}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

const HistoryTimelineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5v7h4m6 0a10 10 0 11-3.06-7.14"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default Home
