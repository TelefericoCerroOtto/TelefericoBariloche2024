import { Toggle } from "@/components/ui/toggle";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const headingLevels: HeadingLevel[] = [0, 1, 2, 3, 4, 5, 6];

export default function Toolbar({ editor }: { editor: Editor | null }) {
  // Sólo para forzar re-render cuando cambia la selección/estado del editor
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const rerender = () => setTick((t) => t + 1);

    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    editor.on("update", rerender);
    // primer sync
    rerender();

    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
      editor.off("update", rerender);
    };
  }, [editor]);

  const headings = useMemo(
    () => ({
      0: <Heading size={14} />,
      1: <Heading1 size={16} />,
      2: <Heading2 size={16} />,
      3: <Heading3 size={16} />,
      4: <Heading4 size={16} />,
      5: <Heading5 size={16} />,
      6: <Heading6 size={16} />,
    }),
    [],
  );

  if (!editor) return null;

  // Nivel de heading actual según caret/selección
  const headingLevel = (([1, 2, 3, 4, 5, 6] as HeadingLevel[]).find((l) =>
    editor.isActive("heading", { level: l }),
  ) ?? 0) as HeadingLevel;

  const options = [
    {
      icon: <Bold className="size-4" />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      pressed: editor.isActive("bold"),
    },
    {
      icon: <Italic className="size-4" />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      pressed: editor.isActive("italic"),
    },
    {
      icon: <Strikethrough className="size-4" />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      pressed: editor.isActive("strike"),
    },
    {
      icon: <Underline className="size-4" />,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      pressed: editor.isActive("underline"),
    },
    {
      icon: <List className="size-4" />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      pressed: editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered className="size-4" />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      pressed: editor.isActive("orderedList"),
    },
  ] as const;

  return (
    <div className="z-50 mb-1 space-x-2 rounded-md border bg-slate-50 p-1">
      <div className="relative inline">
        <button className="p-2">{headings[headingLevel]}</button>
        <select
          value={headingLevel}
          onChange={(e) => {
            const level = Number(e.target.value) as HeadingLevel;
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
          className="absolute left-0 top-0 h-full w-full cursor-pointer opacity-0"
        >
          {headingLevels.map((level) => (
            <option key={level} value={level}>
              {level === 0 ? "Ninguno" : `H${level}`}
            </option>
          ))}
        </select>
      </div>

      {options.map((opt, i) => (
        <Toggle
          key={i}
          pressed={opt.pressed}
          onPressedChange={() => opt.onClick()} // ignoramos el boolean y ejecutamos toggle
          className="data-[state=on]:bg-slate-300 data-[state=on]:text-slate-900 dark:data-[state=on]:bg-slate-700 dark:data-[state=on]:text-slate-50"
        >
          {opt.icon}
        </Toggle>
      ))}
    </div>
  );
}
