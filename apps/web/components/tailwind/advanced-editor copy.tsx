"use client";
import { EditorContent } from "@/packages/novel/src";
import { useEditor } from "@tiptap/react";
import { useCompletion } from "ai/react";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { EditorContentRendor } from "./editorContentRendor";
import { defaultExtensions } from "./extensions";
import { TiptapExtensions } from "./extensions2";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { TiptapEditorProps } from "./props";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";
import { Separator } from "./ui/separator";
const hljs = require("highlight.js");
const defaultEditorContent = { type: "doc", content: [{ type: "heading", attrs: { level: 4 } }] };
const extensions = [...defaultExtensions, slashCommand];
const TailwindAdvancedEditor = () => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("已保存");
  const [charsCount, setCharsCount] = useState();
  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [editorShow, setEditorShow] = useState(true);
  // const { editor } = useEditor();
  // console.log('index:::::::---', editor);
  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(async (editor) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
    setSaveStatus("已保存");
  }, 500);

  const oldDebouncedUpdates = useDebouncedCallback(async (editor) => {
    const json = editor.getJSON();
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
    setSaveStatus("已保存");
    // setEditorShow(true)
  }, 500);

  const editor = useEditor({
    extensions: TiptapExtensions,
    editorProps: TiptapEditorProps,
    onUpdate: (e) => {
      setSaveStatus("未保存");
    },
    autofocus: "end",
  });

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);
  }, []);

  const { completion, complete, isLoading } = useCompletion({
    // id: "novel",
    api: "/api/generate",
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        // va.track("Rate Limit Reached");
        return;
      }
      // console.log('window.localStorage.getItem("markdown")', window.localStorage.getItem("markdown"));
      setEditorShow(false)
    },
    onFinish: (_prompt, completion) => {
      console.log("completion", completion);
      // editor.chain().focus().run();
      // stopSetContent();
      // console.log("end---------completion", `${window.localStorage.getItem("markdown")}${completion}`);
      // window.localStorage.setItem("markdown", `${window.localStorage.getItem("markdown")}${completion}`);
      oldDebouncedUpdates(editor);
    },
    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  useEffect(() => {
    // 创建一个全局的 EventTarget 实例
    const globalEventTarget = new EventTarget();

    const customEvent = new CustomEvent("aiContinue", { detail: "3445" });
    globalEventTarget.dispatchEvent(customEvent);

    // 添加事件监听器
    globalEventTarget.addEventListener("aiContinue", (event) => {
      console.log("自定义事件已触发，携带的数据:", event.detail);
    });
  }, []);

  useEffect(() => {
    if (completion) {
      // console.log("completion", completion);
      // setContent(completion);
      // editor?.commands?.setContent(completion);
      editor.chain().focus().setContent(`${window.localStorage.getItem("markdown")}${completion}`).run();
    }
  }, [completion]);

  useEffect(() => {
    // editor &&
    //   setTimeout(() => {
    //     complete(window.localStorage.getItem("markdown"), { body: { option: "continue" } });
    //   }, 1000);
    // editor?.commands?.setContent(window.localStorage.getItem("markdown"));
  }, [editor]);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">{saveStatus}</div>
        <div className={charsCount ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground" : "hidden"}>
          {charsCount} Words
        </div>
      </div>

      {
        !editorShow &&
        <div className="editor-rendor relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg">
          <div>
            <div className="tiptap ProseMirror prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full">
              <EditorContentRendor editor={editor} />
            </div>
          </div>
        </div>
      }

      {editorShow &&
        <EditorRoot>
          <EditorContent
            initialContent={initialContent}
            extensions={extensions}
            className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view, event) => {
                  console.log("keydown-----", event);
                  handleCommandNavigation(event);
                },
              },
              handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
              handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
              attributes: {
                class:
                  "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
              },
            }}
            onUpdate={({ editor }) => {
              debouncedUpdates(editor);
              setSaveStatus("未保存");
            }}
            slotAfter={<ImageResizer />}
          >
            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
              <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
              <EditorCommandList>
                {suggestionItems.map((item) => (
                  <EditorCommandItem
                    value={item.title}
                    onCommand={(val) => item.command(val)}
                    className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                    key={item.title}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </EditorCommandItem>
                ))}
              </EditorCommandList>
            </EditorCommand>

            <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
              <Separator orientation="vertical" />
              <NodeSelector open={openNode} onOpenChange={setOpenNode} />
              <Separator orientation="vertical" />
              <LinkSelector open={openLink} onOpenChange={setOpenLink} />
              <Separator orientation="vertical" />
              <MathSelector />
              <Separator orientation="vertical" />
              <TextButtons />
              <Separator orientation="vertical" />
              <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            </GenerativeMenuSwitch>
          </EditorContent>
        </EditorRoot>
      }
    </div>
  );
};

export default TailwindAdvancedEditor;
