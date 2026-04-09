'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write here...',
  label,
  error,
  readOnly = false,
  minHeight = '120px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value ?? '');
    }
  }, [value, editor]);

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[#2D2D2D]">{label}</label>}
      <div
        className={`rounded-lg border bg-white text-sm text-[#2D2D2D] focus-within:ring-2 focus-within:ring-[#EF323F] focus-within:border-transparent ${
          error ? 'border-red-500' : 'border-[#D3D3D3]'
        } ${readOnly ? 'bg-gray-50' : ''}`}
      >
        {!readOnly && (
          <div className="flex flex-wrap gap-1 border-b border-[#D3D3D3] px-2 py-1.5">
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive('italic')}
              title="Italic"
            >
              <em>I</em>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive('bulletList')}
              title="Bullet list"
            >
              &#8226; List
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive('orderedList')}
              title="Numbered list"
            >
              1. List
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive('heading', { level: 3 })}
              title="Heading"
            >
              H3
            </ToolbarBtn>
          </div>
        )}
        <EditorContent
          editor={editor}
          className="px-3 py-2.5 outline-none"
          style={{ minHeight }}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .tiptap:focus { outline: none; }
        .tiptap ul { list-style-type: disc; padding-left: 1.2rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.2rem; }
        .tiptap h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .tiptap p { margin-bottom: 0.25rem; }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-xs transition-colors ${
        active ? 'bg-[#EF323F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
