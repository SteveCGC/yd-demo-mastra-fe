import {
  AppstoreOutlined,
  CloudOutlined,
  CompassOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  List,
  message,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { useEffect, useMemo, useRef, useState } from 'react'
import remarkGfm from 'remark-gfm'
import { mastraClient } from '../../lib/mastra'

const { Sider, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  city: string
  createdAt: string
  messages: ChatMessage[]
}

const STORAGE_KEY = 'yd-weather-conversations'

const quickActions = [
  {
    id: 'bj',
    title: '济南 · 实时天气',
    city: '济南',
    description: '获取 24 小时温度曲线与出行建议',
    prompt: '请以图文并茂的方式总结济南未来 24 小时的天气，并给出通勤与出行建议。',
    accent: '#0ea5e9',
  },
  {
    id: 'sh',
    title: '上海 · 穿衣建议',
    city: '上海',
    description: '结合体感温度给出穿搭提示',
    prompt: '请根据上海今天的气象要素，输出一份分时段的穿衣建议，并包含防晒/防雨提示。',
    accent: '#f97316',
  },
  {
    id: 'cd',
    title: '成都 · 亲子活动',
    city: '成都',
    description: '根据天气推荐亲子活动',
    prompt: '请结合天气情况，推荐 3 个适合亲子出行的室内/室外活动，并写明最佳时间段。',
    accent: '#22c55e',
  },
]

const markdownComponents: Components = {
  h1: ({ children }) => <Title level={3}>{children}</Title>,
  h2: ({ children }) => <Title level={4}>{children}</Title>,
  h3: ({ children }) => <Title level={5}>{children}</Title>,
  p: ({ children }) => (
    <Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{children}</Paragraph>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
  ol: ({ children }) => <ol className="markdown-list ordered">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="markdown-link">
      {children}
    </a>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="markdown-code-inline">{children}</code>
    ) : (
      <pre className="markdown-code-block">
        <code>{children}</code>
      </pre>
    ),
}

function createConversation(city: string): Conversation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: `${city || '未命名城市'} · 天气助手`,
    city,
    createdAt: now,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `你好，我是你的天气助手。告诉我关于「${city || '你关心的城市'}」的任何问题，我会结合实时天气给出建议。`,
        timestamp: now,
      },
    ],
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const WeatherAssistant = () => {
  const [messageApi, contextHolder] = message.useMessage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [city, setCity] = useState('济南')
  const [prompt, setPrompt] = useState('请告诉我今天的天气情况，并给出出行与穿衣建议。')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<TextAreaRef>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed: Conversation[] = JSON.parse(raw)
        setConversations(parsed)
        setActiveId(parsed[0]?.id ?? null)
        setCity(parsed[0]?.city || '济南')
      } catch {
        const seed = createConversation('济南')
        setConversations([seed])
        setActiveId(seed.id)
        setCity('济南')
      }
    } else {
      const seed = createConversation('济南')
      setConversations([seed])
      setActiveId(seed.id)
    }
    setIsInitializing(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  }, [conversations])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  )

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations
    return conversations.filter((conversation) => {
      const keyword = searchTerm.toLowerCase()
      return (
        conversation.title.toLowerCase().includes(keyword) ||
        conversation.city.toLowerCase().includes(keyword)
      )
    })
  }, [conversations, searchTerm])

  useEffect(() => {
    if (!activeConversation) return
    setCity(activeConversation.city || '济南')
  }, [activeConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages.length])

  const handleCreateConversation = () => {
    const next = createConversation('济南')
    setConversations((prev) => [next, ...prev])
    setActiveId(next.id)
    setCity('济南')
    setPrompt('请告诉我今天的天气情况，并给出出行与穿衣建议。')
    messageApi.success('已创建新的天气对话')
  }

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((item) => item.id !== id)
      if (activeId === id) {
        setActiveId(filtered[0]?.id ?? null)
      }
      return filtered
    })
  }

  const handleClearConversations = () => {
    const seed = createConversation('济南')
    setConversations([seed])
    setActiveId(seed.id)
    messageApi.info('对话记录已重置')
  }

  const updateConversationMessages = (conversationId: string, updater: (messages: ChatMessage[]) => ChatMessage[]) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation
        return {
          ...conversation,
          messages: updater(conversation.messages),
        }
      }),
    )
  }

  const handleSend = async (overrides?: { city?: string; prompt?: string }) => {
    const targetCity = (overrides?.city ?? city).trim()
    const targetPrompt = (overrides?.prompt ?? prompt).trim()

    if (!targetCity) {
      messageApi.warning('请先填写想查询的城市')
      return
    }

    if (!targetPrompt) {
      messageApi.warning('请输入你想咨询的问题')
      return
    }

    setCity(targetCity)
    setPrompt('')
    setIsSending(true)

    let conversation = activeConversation
    let shouldPrepend = false

    if (!conversation) {
      conversation = createConversation(targetCity)
      shouldPrepend = true
      setActiveId(conversation.id)
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `城市：${targetCity}\n需求：${targetPrompt}`,
      timestamp: new Date().toISOString(),
    }

    const optimisticConversation: Conversation = {
      ...conversation,
      city: targetCity,
      title: `${targetCity} · 天气助手`,
      messages: [...conversation.messages, userMessage],
    }

    setConversations((prev) => {
      if (shouldPrepend) {
        return [optimisticConversation, ...prev]
      }
      return prev.map((item) => (item.id === optimisticConversation.id ? optimisticConversation : item))
    })

    try {
      const agent = mastraClient.getAgent('weatherAgent')
      const response = await agent.generate({
        messages: optimisticConversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      })

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
      }

      updateConversationMessages(optimisticConversation.id, (messages) => [...messages, assistantMessage])
      textareaRef.current?.focus()
    } catch (error) {
      console.error(error)
      messageApi.error('请求天气助手失败，请稍后再试')
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '抱歉，暂时无法连接到天气助手，请稍后再试一次。',
        timestamp: new Date().toISOString(),
      }
      updateConversationMessages(optimisticConversation.id, (messages) => [...messages, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handleQuickAction = (action: (typeof quickActions)[number]) => {
    setCity(action.city)
    setPrompt(action.prompt)
    messageApi.success(`已为你准备好「${action.title}」的提问，可直接发送`)
  }

  const selectedMessages = activeConversation?.messages ?? []
  const handleActivateConversation = (conversation: Conversation) => {
    setActiveId(conversation.id)
    setCity(conversation.city)
    setPrompt('请告诉我今天的天气情况，并给出出行与穿衣建议。')
  }
  const messageCount = selectedMessages.length

  return (
    <Layout className="assistant-layout">
      {contextHolder}
      <Sider width={320} className="app-sider">
        <div className="sider-inner">
          <div className="sider-os-bar">
            <span className="sider-dot red" />
            <span className="sider-dot yellow" />
            <span className="sider-dot green" />
          </div>
          <div className="sider-brand">
            <div>
              <Title level={4} style={{ marginBottom: 0 }}>
                Aurora Weather
              </Title>
              <Text type="secondary">Mastra Agent</Text>
            </div>
            <Tag color="blue">实时 · 智能</Tag>
          </div>

          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索对话或城市"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} size="large" block onClick={handleCreateConversation}>
            新建对话
          </Button>

          <div className="sider-section-label">
            <MessageOutlined />
            <span>对话</span>
          </div>
          <div className="conversation-section">
            {filteredConversations.length ? (
              <div className="conversation-list">
                {filteredConversations.map((item) => (
                  <div
                    key={item.id}
                    className={`conversation-card ${item.id === activeId ? 'active' : ''}`}
                    onClick={() => handleActivateConversation(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleActivateConversation(item)
                      }
                    }}
                  >
                    <div className="conversation-meta">
                      <div>
                        <Text strong ellipsis style={{ maxWidth: 160 }}>
                          {item.title}
                        </Text>
                        <Text type="secondary" style={{ display: 'block' }}>
                          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                        </Text>
                      </div>
                      <Tag color="blue">{item.city || '未命名'}</Tag>
                    </div>
                    <Tooltip title="删除对话">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteConversation(item.id)
                        }}
                      />
                    </Tooltip>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无匹配的对话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>

          <div className="sider-section-label">
            <AppstoreOutlined />
            <span>快速提问</span>
          </div>
          <div className="quick-action-grid">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="quick-action-tile"
                onClick={() => handleQuickAction(action)}
              >
                <div className="quick-action-accent" style={{ background: action.accent }} />
                <div className="quick-action-body">
                  <Text strong ellipsis>
                    {action.title}
                  </Text>
                  <Paragraph type="secondary" style={{ margin: 0 }} ellipsis={{ rows: 2 }}>
                    {action.description}
                  </Paragraph>
                </div>
                <Tag icon={<EnvironmentOutlined />} color="success">
                  {action.city}
                </Tag>
              </button>
            ))}
          </div>
        </div>
        <div className="sider-footer">
          <Button icon={<HistoryOutlined />} onClick={handleClearConversations} block>
            重置对话
          </Button>
          <Button type="text" icon={<ShareAltOutlined />} onClick={() => messageApi.info('分享功能开发中')}>
            分享
          </Button>
        </div>
      </Sider>
      <Layout className="content-layout">
        <div className="top-bar">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              天气助手
            </Title>
            <Text type="secondary">智能洞察 + 实时气象，帮你规划每一天。</Text>
          </div>
          <Space>
            <Button icon={<CloudOutlined />} ghost>
              实况同步
            </Button>
            <Button icon={<ThunderboltOutlined />} ghost>
              智能建议
            </Button>
            <Button icon={<SettingOutlined />} type="text" />
          </Space>
        </div>
        <Content className="chat-content">
          <div className="chat-overview">
            <Card size="small" bordered={false}>
              <Statistic
                title="当前城市"
                value={activeConversation?.city || '未设置'}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <Statistic
                title="历史消息"
                value={messageCount}
                prefix={<HistoryOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <Statistic
                title="对话数"
                value={conversations.length}
                prefix={<CompassOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </div>

          <div className="chat-messages">
            {isInitializing ? (
              <div className="chat-placeholder">
                <Spin tip="加载对话中..." />
              </div>
            ) : selectedMessages.length ? (
              selectedMessages.map((messageItem) => (
                <div
                  key={messageItem.id}
                  className={`message-bubble ${messageItem.role === 'user' ? 'user' : 'assistant'}`}
                >
                  <div className="message-meta">
                    <Badge color={messageItem.role === 'user' ? 'geekblue' : 'green'} />
                    <Text type="secondary">{messageItem.role === 'user' ? '你' : '天气助手'}</Text>
                    <Text type="secondary">· {formatTime(messageItem.timestamp)}</Text>
                  </div>
                  <div className="markdown-body">
                    <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {messageItem.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            ) : (
              <div className="chat-placeholder">
                <Empty description="还没有任何对话，先在左侧创建一个吧～" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-composer">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Input
                size="large"
                prefix={<EnvironmentOutlined />}
                placeholder="请输入想查询的城市"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              <TextArea
                ref={textareaRef}
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="告诉我你想了解的天气场景，例如：'本周末上海适合骑行吗？'"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onPressEnter={(event) => {
                  if (!event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text type="secondary">由 Mastra Client 驱动的天气智能体</Text>
                <Button type="primary" icon={<SendOutlined />} loading={isSending} onClick={() => handleSend()}>
                  发送
                </Button>
              </Space>
            </Space>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default WeatherAssistant
