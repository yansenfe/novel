import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const matchPrompt = (option: string, prompt: string) => {
  switch (option) {
    case "continue":
      return [
        {
          role: "system",
          content:
            "你是一个AI写作助手，根据先前文本的上下文继续现有文本。赋予后面的字符比开头的字符更多的权重/优先级。将你的回答字数在50-200之间，但一定要构造完整的句子 在适当的时候使用Markdown格式。",
        },
        {
          role: "user",
          content: prompt,
        },
      ];
    case "improve":
      return [
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
      ];
    case "shorter":
      return [
        {
          role: "system",
          content: "你是一个AI写作助手，可以缩短现有文本。" + "在适当的时候使用Markdown格式。",
        },
        {
          role: "user",
          content: `现有文本为: ${prompt}`,
        },
      ];
    case "longer":
      return [
        {
          role: "system",
          content: "你是一个AI写作助手，可以延长现有的文本。" + "在适当的时候使用Markdown格式。",
        },
        {
          role: "user",
          content: `现有文本为: ${prompt}`,
        },
      ];

    case "fix":
      return [
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
      ];

    case "zap":
      return [
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
      ];
    default:
      return prompt;
  }
};
