import { ChatOpenAI } from "@langchain/openai";
import { LangChainAdapter } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const model = new ChatOpenAI({
    model: "mtm_qwen_llm",
    temperature: 0,
    configuration: {
      baseURL: "http://192.168.100.82:9080/llm/v1",
      apiKey: "NOT_NEED",
    },
    modelKwargs: { chat_template_kwargs: { enable_thinking: false } },
  });

  const stream = await model.stream(prompt);

  return LangChainAdapter.toDataStreamResponse(stream);
}
