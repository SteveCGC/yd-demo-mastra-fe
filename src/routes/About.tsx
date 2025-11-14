import { Card, Divider, List, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

const steps = [
  '在输入区粘贴前端代码（支持 React / Vue / Svelte 等）。',
  '补充上下文信息：例如运行环境、性能目标或历史背景。',
  '点击「生成评审建议」，等待 AI 输出结构化审查结果。',
  '根据输出的 TODO 逐条落实，并再次粘贴最新代码复查。',
]

export default function About() {
  return (
    <div className="about-page">
      <Card className="about-card" bordered={false}>
        <Title level={3}>关于代码评审助手</Title>
        <Paragraph>
          该工具基于 Mastra 和 Cloudflare Workers 搭建，面向前端工程师提供高质量的代码评审建议。模型会重点关注性能、可访问性、组件化、状态管理、样式体系等方面，并生成可直接放入
          PR 的 Markdown 报告。
        </Paragraph>

        <Divider />
        <Title level={4}>使用步骤</Title>
        <List
          dataSource={steps}
          renderItem={(item, index) => (
            <List.Item>
              <Text strong style={{ marginRight: 8 }}>
                {index + 1}.
              </Text>
              <Text>{item}</Text>
            </List.Item>
          )}
        />

        <Divider />
        <Paragraph type="secondary">
          评审结果仅供参考；在合并代码前请结合团队规范与真实运行行为再次确认。
        </Paragraph>
      </Card>
    </div>
  )
}
