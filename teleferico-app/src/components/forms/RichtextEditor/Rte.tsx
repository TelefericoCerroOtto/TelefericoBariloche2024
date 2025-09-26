"use client";

import UnderlineExtension from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, EditorContentProps, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type RefAttributes } from "react";
import Toolbar from "./Toolbar";

interface Props
  extends RefAttributes<HTMLDivElement>,
    Omit<EditorContentProps, "ref" | "editor"> {
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
}

const Rte = (props: Props) => {
  const {
    label = "Editor",
    content,
    id,
    name,
    placeholder = "Escriba algo...",
    errorMessage,
    isRequired,
    isInvalid,
    onChange,
    onBlur,
  } = props;
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      Placeholder.configure({
        placeholder: ({ editor, node, pos }) => {
          const { state } = editor;
          const doc = state.doc;

          // ¿El doc tiene algún texto real?
          const isDocEmpty =
            doc.textBetween(0, doc.content.size, " ", " ").trim().length === 0;

          if (!isDocEmpty) return "";

          // Pos puede venir undefined en algunos nodos; protegemos
          if (typeof pos !== "number") return "";

          const $pos = state.doc.resolve(pos);
          const isFirstBlock = $pos.index(0) === 0;

          // Mostrá sólo en el primer párrafo vacío
          return isFirstBlock && node.type.name === "paragraph"
            ? placeholder
            : "";
        },
        emptyNodeClass: "pm-placeholder",
        showOnlyCurrent: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm focus:outline-none min-h-[250px] leading-5 prose-p:my-1 prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
      },
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  // const saveContent = () => {
  //   if (editor) {
  //     console.log(editor.getJSON());
  //   }
  // };

  return (
    <>
      <div className="flex flex-col">
        <div className="w-full p-2">
          <p className="text-sm">
            {label}
            {isRequired ? <span className="text-red-600"> *</span> : ""}
          </p>
          <Toolbar editor={editor} />
          <EditorContent
            id={id}
            name={name}
            editor={editor}
            className={`rounded-lg border p-2 ${isInvalid && "border-red-600"}`}
            onChange={onChange}
            onBlur={onBlur}
          />
          {isInvalid && <p className="text-sm text-red-600">{errorMessage}</p>}
          {/* <button
            onClick={saveContent}
            className="mt-2 rounded bg-blue-500 p-2 text-white"
          >
            Log content
          </button> */}
        </div>
      </div>
    </>
  );
};

export default Rte;
