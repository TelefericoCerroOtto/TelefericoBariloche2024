"use client";

import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import { Tooltip } from "@heroui/react";
import type {
  FormikErrors,
  FormikTouched,
  FormikValues,
  FormikProps,
} from "formik";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

const isBrowser = typeof window !== "undefined";

type LocaleConfig = {
  label: string;
  placeholder?: string;
  name: string;
};

type BlocksTextNode = {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

type BlocksLinkNode = {
  type: "link";
  url: string;
  children: BlocksChildNode[];
};

type BlocksParagraphNode = {
  type: "paragraph";
  children: BlocksChildNode[];
};

type BlocksHeadingNode = {
  type: "heading";
  level?: number;
  children: BlocksChildNode[];
};

type BlocksListItemNode = {
  type: "list-item";
  children: BlocksChildNode[];
};

type BlocksListNode = {
  type: "list";
  format: "ordered" | "unordered";
  children: BlocksListItemNode[];
};

type BlocksQuoteNode = {
  type: "quote";
  children: BlocksChildNode[];
};

type BlocksChildNode =
  | BlocksTextNode
  | BlocksLinkNode
  | BlocksParagraphNode
  | BlocksHeadingNode
  | BlocksListNode
  | BlocksListItemNode
  | BlocksQuoteNode;

type BlocksContent = BlocksChildNode[];

type Marks = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textNodeToHtml = (node: BlocksTextNode) => {
  let content = escapeHtml(node.text ?? "");
  if (node.bold) {
    content = `<strong>${content}</strong>`;
  }
  if (node.italic) {
    content = `<em>${content}</em>`;
  }
  if (node.underline) {
    content = `<u>${content}</u>`;
  }
  return content;
};

const childrenToHtml = (children: BlocksChildNode[]): string =>
  children
    .map((child) => {
      switch (child.type) {
        case "text":
          return textNodeToHtml(child);
        case "link":
          return `<a href="${child.url}">${childrenToHtml(child.children)}</a>`;
        case "paragraph":
          return `<p>${childrenToHtml(child.children)}</p>`;
        case "heading": {
          const level = Math.min(Math.max(child.level ?? 1, 1), 6);
          return `<h${level}>${childrenToHtml(child.children)}</h${level}>`;
        }
        case "list": {
          const tag = child.format === "ordered" ? "ol" : "ul";
          const items = child.children
            .map((item) => `<li>${childrenToHtml(item.children)}</li>`)
            .join("");
          return `<${tag}>${items}</${tag}>`;
        }
        case "quote":
          return `<blockquote>${childrenToHtml(child.children)}</blockquote>`;
        case "list-item":
          return `<li>${childrenToHtml(child.children)}</li>`;
        default:
          return "";
      }
    })
    .join("");

const blocksToHtml = (value: string | undefined): string => {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as BlocksContent;
    return childrenToHtml(parsed);
  } catch (error) {
    console.error("blocksToHtml parse error", error);
    return "";
  }
};

const createTextNode = (text: string, marks: Marks = {}): BlocksTextNode => ({
  type: "text",
  text,
  ...marks,
});

const parseInlineNode = (
  node: Node,
  marks: Marks = {},
): BlocksChildNode[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent ?? "";
    if (!textContent.trim()) {
      return textContent ? [createTextNode(textContent, marks)] : [];
    }
    return [createTextNode(textContent, marks)];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") {
    return [createTextNode("\n", marks)];
  }

  if (tag === "strong" || tag === "b") {
    return Array.from(element.childNodes).flatMap((child) =>
      parseInlineNode(child, { ...marks, bold: true }),
    );
  }

  if (tag === "em" || tag === "i") {
    return Array.from(element.childNodes).flatMap((child) =>
      parseInlineNode(child, { ...marks, italic: true }),
    );
  }

  if (tag === "u") {
    return Array.from(element.childNodes).flatMap((child) =>
      parseInlineNode(child, { ...marks, underline: true }),
    );
  }

  if (tag === "a") {
    const url = element.getAttribute("href") ?? "";
    const children = Array.from(element.childNodes).flatMap((child) =>
      parseInlineNode(child, marks),
    );
    return [
      {
        type: "link",
        url,
        children,
      } satisfies BlocksLinkNode,
    ];
  }

  return Array.from(element.childNodes).flatMap((child) =>
    parseInlineNode(child, marks),
  );
};

const parseBlockElement = (element: HTMLElement): BlocksChildNode | null => {
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case "p": {
      const children = Array.from(element.childNodes).flatMap(parseInlineNode);
      return { type: "paragraph", children } satisfies BlocksParagraphNode;
    }
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = Number(tag.replace("h", ""));
      const children = Array.from(element.childNodes).flatMap(parseInlineNode);
      return { type: "heading", level, children } satisfies BlocksHeadingNode;
    }
    case "blockquote": {
      const children = Array.from(element.childNodes)
        .filter((child) => child.nodeType !== Node.TEXT_NODE || child.textContent?.trim())
        .map((child) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const block = parseBlockElement(child as HTMLElement);
            if (block) {
              return block;
            }
          }
          return {
            type: "paragraph",
            children: parseInlineNode(child),
          } satisfies BlocksParagraphNode;
        });
      return { type: "quote", children } satisfies BlocksQuoteNode;
    }
    case "ul":
    case "ol": {
      const format = tag === "ol" ? "ordered" : "unordered";
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child) => {
          const liChildren = Array.from(child.childNodes)
            .filter((liChild) =>
              liChild.nodeType !== Node.TEXT_NODE || liChild.textContent?.trim(),
            )
            .map((liChild) => {
              if (liChild.nodeType === Node.ELEMENT_NODE) {
                const parsed = parseBlockElement(liChild as HTMLElement);
                if (parsed) return parsed;
              }
              return {
                type: "paragraph",
                children: parseInlineNode(liChild),
              } satisfies BlocksParagraphNode;
            });
          return {
            type: "list-item",
            children: liChildren,
          } satisfies BlocksListItemNode;
        });
      return {
        type: "list",
        format,
        children: items,
      } satisfies BlocksListNode;
    }
    default: {
      const children = Array.from(element.childNodes).flatMap(parseInlineNode);
      if (children.length === 0) return null;
      return { type: "paragraph", children } satisfies BlocksParagraphNode;
    }
  }
};

const htmlToBlocks = (html: string): BlocksContent => {
  if (!isBrowser) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes: BlocksChildNode[] = [];

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim()) {
        nodes.push({ type: "paragraph", children: [createTextNode(text)] });
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const block = parseBlockElement(node as HTMLElement);
      if (block) {
        nodes.push(block);
      }
    }
  });

  return nodes;
};

interface Props<T extends FormikValues> {
  locale: Locales;
  config: Record<Locales, LocaleConfig>;
  values: T;
  errors: FormikErrors<T>;
  touched: FormikTouched<T>;
  setFieldValue: FormikProps<T>["setFieldValue"];
  setFieldTouched: FormikProps<T>["setFieldTouched"];
  isRequired?: boolean;
}

type ToolbarButton = {
  command: string;
  icon: string;
  label: string;
  value?: string;
};

const toolbarButtons: ToolbarButton[] = [
  { command: "bold", icon: "B", label: "Negrita" },
  { command: "italic", icon: "I", label: "Cursiva" },
  { command: "underline", icon: "U", label: "Subrayado" },
  { command: "insertUnorderedList", icon: "•", label: "Lista" },
  { command: "insertOrderedList", icon: "1.", label: "Lista numerada" },
];

const headingButtons: ToolbarButton[] = [
  { command: "formatBlock", icon: "T1", label: "Título 1", value: "h2" },
  { command: "formatBlock", icon: "T2", label: "Título 2", value: "h3" },
  { command: "formatBlock", icon: "P", label: "Párrafo", value: "p" },
];

type EditorProps = {
  value: string;
  placeholder?: string;
  onInput: (html: string) => void;
  onBlur: () => void;
};

const ContentEditable = forwardRef<HTMLDivElement, EditorProps>(
  ({ value, placeholder, onInput, onBlur }, ref) => {
    const handleInput = useCallback(
      (event: FormEvent<HTMLDivElement>) => {
        onInput(event.currentTarget.innerHTML);
      },
      [onInput],
    );

    return (
      <div className="relative">
        <div
          ref={ref}
          className="min-h-[200px] w-full rounded-xl border border-custom-border bg-white px-4 py-3 text-sm text-black focus:outline-none"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={onBlur}
          dangerouslySetInnerHTML={{ __html: value }}
        />
        {placeholder && value.length === 0 ? (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-default-400">
            {placeholder}
          </span>
        ) : null}
      </div>
    );
  },
);

ContentEditable.displayName = "ContentEditable";

export default function LocaleBlocksField<T extends FormikValues>(
  props: Props<T>,
) {
  const {
    locale,
    config,
    values,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    isRequired = true,
  } = props;

  const { label, placeholder, name } = config[locale] ?? config[i18n.defaultLocale];
  const fieldName = name as keyof T;
  const value = values[fieldName] as string | undefined;
  const error = errors[fieldName] as string | undefined;
  const isTouched = touched[fieldName];
  const editorRef = useRef<HTMLDivElement>(null);
  const [htmlValue, setHtmlValue] = useState("");

  useEffect(() => {
    setHtmlValue(blocksToHtml(value));
  }, [value]);

  const execCommand = useCallback((button: ToolbarButton) => {
    if (!isBrowser) return;
    if (button.command === "formatBlock" && button.value) {
      document.execCommand(button.command, false, button.value);
      return;
    }
    document.execCommand(button.command, false);
  }, []);

  const handleInput = useCallback(
    (html: string) => {
      setHtmlValue(html);
      const blocks = htmlToBlocks(html);
      setFieldValue(name, JSON.stringify(blocks));
    },
    [name, setFieldValue],
  );

  const handleBlur = useCallback(() => {
    setFieldTouched(name, true, true);
  }, [name, setFieldTouched]);

  const isInvalid = !!error && !!isTouched;

  const controls = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {headingButtons.map((button) => (
          <Tooltip key={button.icon} content={button.label}>
            <button
              type="button"
              className="rounded-full border border-custom-border px-3 py-1 text-xs font-semibold text-black transition hover:bg-custom-border/40"
              onClick={() => execCommand(button)}
            >
              {button.icon}
            </button>
          </Tooltip>
        ))}
        {toolbarButtons.map((button) => (
          <Tooltip key={button.icon} content={button.label}>
            <button
              type="button"
              className="rounded-full border border-custom-border px-3 py-1 text-xs font-semibold text-black transition hover:bg-custom-border/40"
              onClick={() => execCommand(button)}
            >
              {button.icon}
            </button>
          </Tooltip>
        ))}
      </div>
    ),
    [execCommand],
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-black" htmlFor={name}>
        {label} ({locale}) {isRequired ? "*" : null}
      </label>
      {controls}
      <ContentEditable
        ref={editorRef}
        value={htmlValue}
        placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleBlur}
      />
      {isInvalid ? (
        <p className="text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
