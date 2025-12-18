"use client";

import UnderlineExtension from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extensions";
import {
  EditorContent,
  useEditor,
  type Content,
  type EditorContentProps,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import debounce from "lodash/debounce";
import { useEffect, useMemo, useRef, type RefAttributes } from "react";
import Toolbar from "./Toolbar";

interface Props
  extends RefAttributes<HTMLDivElement>,
    Omit<
      EditorContentProps,
      "ref" | "editor" | "onChange" | "onBlur" | "content"
    > {
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  // eslint-disable-next-line no-unused-vars
  onChange?: (json: JSONContent) => void;
  // eslint-disable-next-line no-unused-vars
  onBlur?: () => void;
  content?: Content;
}

const Rte = (props: Props) => {
  const {
    label = "Editor",
    content,
    id,
    name,
    value,
    placeholder = "Escriba algo...",
    errorMessage,
    isRequired,
    isInvalid,
    onChange,
    onBlur,
  } = props;
  const skipNextOnUpdateRef = useRef(true);
  const lastSerializedRef = useRef("");

  const emitChangeDebounced = useMemo(
    () =>
      debounce((raw: JSONContent) => {
        // trabajo pesado acá, pero solo si hubo cambio real
        const plain = JSON.parse(JSON.stringify(raw)) as JSONContent; // sello a POJO
        onChange?.(plain);
      }, 250),
    [onChange],
  );

  useEffect(() => {
    return () => {
      emitChangeDebounced.cancel(); // evita setState después del unmount
    };
  }, [emitChangeDebounced]);

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
    onUpdate: ({ editor }) => {
      if (skipNextOnUpdateRef.current) {
        skipNextOnUpdateRef.current = false;
        return;
      }

      const raw = editor.getJSON();
      const serialized = JSON.stringify(raw);

      if (serialized === lastSerializedRef.current) return; // no cambió, salir
      lastSerializedRef.current = serialized;

      emitChangeDebounced(raw); // programo el sellado + onChange
    },
    onBlur: ({ editor }) => {
      // Forzar último envío inmediato (sin debounce)
      const raw = editor.getJSON();
      const serialized = JSON.stringify(raw);
      if (serialized !== lastSerializedRef.current) {
        lastSerializedRef.current = serialized;
        const plain = JSON.parse(JSON.stringify(raw)) as JSONContent;
        onChange?.(plain);
      }
      emitChangeDebounced.flush();
      onBlur?.();
    },
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm focus:outline-none min-h-[250px] leading-5 prose-p:my-1 prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    // Sincronización “afuera → adentro” (prop `content` cambió):
    // - `emitChangeDebounced.cancel()` descarta cualquier onChange pendiente del ciclo anterior
    //   Evita emitir un estado viejo justo después de setear contenido desde el componente padre (prop `content`).
    // - `skipNextOnUpdateRef.current = true` ignora el onUpdate que provoca setContent/clearContent,
    //   para no marcar el form como dirty ni disparar validaciones por un cambio programático.
    // - `lastSerializedRef.current = ""` (o JSON actual) alinea el cache local con el nuevo estado,
    //   evitando que el próximo onUpdate se considere un cambio real.

    // Caso content vacio
    if (content === undefined || content === null) {
      if (!editor.isEmpty) {
        emitChangeDebounced.cancel();
        skipNextOnUpdateRef.current = true;
        editor.commands.clearContent(true);
        lastSerializedRef.current = "";
      }
      return;
    }

    const currentJsonSerialized = JSON.stringify(editor.getJSON());

    // Caso content es string
    if (typeof content === "string") {
      const currentText = editor.getText();
      if (currentText !== content) {
        emitChangeDebounced.cancel();
        skipNextOnUpdateRef.current = true;
        editor.commands.setContent(content);
        lastSerializedRef.current = currentJsonSerialized;
      }
      return;
    }

    const incomingJson = content as JSONContent;

    // Caso content es json
    if (currentJsonSerialized !== JSON.stringify(incomingJson)) {
      emitChangeDebounced.cancel();
      skipNextOnUpdateRef.current = true;
      editor.commands.setContent(incomingJson);
      lastSerializedRef.current = JSON.stringify(incomingJson);
    }
  }, [editor, content, emitChangeDebounced]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="w-full p-2">
          <p className="text-base font-semibold">
            {label}
            {isRequired ? <span className="text-red-600"> *</span> : ""}
          </p>
          <Toolbar editor={editor} />
          <EditorContent
            id={id}
            name={name}
            editor={editor}
            value={value}
            className={`rounded-lg border p-2 ${isInvalid && "border-red-600"}`}
          />
          {isInvalid && (
            <p className="text-base text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Rte;
