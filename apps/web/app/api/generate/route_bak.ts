import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { streamText } from "ai";
import { match } from "ts-pattern";

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
export const runtime = "edge";

const myModel = createOpenAICompatible({
  baseURL: "http://192.168.100.82:9080/llm/v1",
  name: "example",
  apiKey: "NOT_NEED",
  queryParams: {
    chat_template_kwargs: { enable_thinking: false },
  },
}).chatModel("mtm_qwen_llm");

export async function POST(req: Request): Promise<Response> {
  // Check if the OPENAI_API_KEY is set, if not return 400
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
    return new Response("Missing OPENAI_API_KEY - make sure to add it to your .env file.", {
      status: 400,
    });
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(`novel_ratelimit_${ip}`);

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  const { prompt, option, command } = await req.json();
  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content:
          "你是一个AI写作助手，根据先前文本的上下文继续现有文本。赋予后面的字符比开头的字符更多的权重/优先级。将你的回答限制在200个字符以内，但一定要构造完整的句子 在适当的时候使用Markdown格式。",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content:
          "你是一个改进现有文本的人工智能写作助手。" +
          "将你的回答限制在200个字符以内，但一定要构造完整的句子。" +
          "在适当的时候使用Markdown格式。",
      },
      {
        role: "user",
        content: `现有文本为: ${prompt}`,
      },
    ])
    .with("shorter", () => [
      {
        role: "system",
        content: "你是一个AI写作助手，可以缩短现有文本。" + "在适当的时候使用Markdown格式。",
      },
      {
        role: "user",
        content: `现有文本为: ${prompt}`,
      },
    ])
    .with("longer", () => [
      {
        role: "system",
        content: "你是一个AI写作助手，可以延长现有的文本。" + "在适当的时候使用Markdown格式。",
      },
      {
        role: "user",
        content: `现有文本为: ${prompt}`,
      },
    ])
    .with("fix", () => [
      {
        role: "system",
        content:
          "你是一个人工智能写作助手，可以修复现有文本中的语法和拼写错误。" +
          "将你的回答限制在200个字符以内，但一定要构造完整的句子。" +
          "在适当的时候使用Markdown格式。",
      },
      {
        role: "user",
        content: `现有文本为: ${prompt}`,
      },
    ])
    .with("zap", () => [
      {
        role: "system",
        content:
          "您可以使用一个基于提示生成文本的AI写作助手。" +
          "您接收用户的输入和操纵文本的命令" +
          "在适当的时候使用Markdown格式。",
      },
      {
        role: "user",
        content: `对于本文: ${prompt}. 你必须尊重命令: ${command}`,
      },
    ])
    .run();

  const result = await streamText({
    prompt: messages[messages.length - 1].content,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    // model: openai("gpt-4o-mini"),
    // model: deepseek('deepseek-chat'),
    model: myModel,
    // providerOptions: {
    //   chat_template_kwargs: { enable_thinking: false },
    // },
    providerOptions: {
      example: { extra_body: { chat_template_kwargs: { enable_thinking: false } } },
    },
  });

  return result.toDataStreamResponse();
}
