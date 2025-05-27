"use client";
import { AppContext } from "@/contexts/AppContext";
import { matchPrompt } from "@/lib/utils";
// import { EditorContent } from "@/packages/novel/src";
import { useEditor } from "@tiptap/react";
import { useCompletion } from "ai/react";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useRef, useState } from "react";
import { useContext } from "react";
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
  const myEditorRef = useRef(null);
  const { someData, setSomeData } = useContext(AppContext) || {}; // 使用 useContext 钩子访问上下文值
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
    const getMarkdown = editor.storage.markdown.getMarkdown();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", getMarkdown);
    if (someData !== "continue") {
      setSaveStatus("已保存");
    }
  }, 500);

  const oldDebouncedUpdates = useDebouncedCallback(async (editor) => {
    const json = editor.getJSON();
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
    setSaveStatus("已保存");
    setEditorShow(true);
    setInitialContent(editor.storage.markdown.getMarkdown());
    setSomeData("");
    setTimeout(() => {
      if (myEditorRef.current) {
        // 检查 myEditorRef.current 是否存在
        myEditorRef.current.focus();
      }
    }, 100);
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

  useEffect(() => {
    if (someData === "continue") {
      const selection = Number(window.localStorage.getItem("selectionTo"))  // 10;
      const markdownContent = window.localStorage.getItem("markdown");
      let mycontent = markdownContent.slice(0, selection - 2);
      if (mycontent.includes('\n')) {
        mycontent = mycontent.split('\n').slice(-1)[0];
      }
      complete(matchPrompt("continue", mycontent), { body: { option: "continue" } });
    }
  }, [someData]);

  const { completion, complete, isLoading } = useCompletion({
    // id: "novel",
    api: "/api/generate",
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        return;
      }
      setEditorShow(false);
    },
    onFinish: (_prompt, completion) => {
      oldDebouncedUpdates(editor);
    },
    onError: () => {
      toast.error("Something went wrong.");
    },
  });

  useEffect(() => {
    if (completion) {
      // 获取光标位置
      const selection = Number(window.localStorage.getItem("selectionTo"))  // 10;
      const markdownContent = window.localStorage.getItem("markdown");
      editor
        .chain()
        .focus()
        .setContent(`${markdownContent.slice(0, selection - 2)}${completion}${markdownContent.slice(selection - 1)}`)
        .run();
      setSaveStatus("未保存");
    }
  }, [completion]);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">{saveStatus}</div>
        {/* <div className={charsCount ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground" : "hidden"}>
          {charsCount} Words
        </div> */}
      </div>

      {!editorShow && (
        <div className="editor-rendor relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg">
          <div>
            <EditorContentRendor editor={editor} />
          </div>
        </div>
      )}

      {editorShow && (
        <EditorRoot>
          <EditorContent
            initialContent={initialContent}
            extensions={extensions}
            ref={myEditorRef}
            className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view, event) => {
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
      )}
    </div>
  );
};

export default TailwindAdvancedEditor;
