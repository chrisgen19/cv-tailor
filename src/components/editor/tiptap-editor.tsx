"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import type { Editor } from "@tiptap/react";
import {
	Bold,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	ListOrdered,
	Redo,
	Underline as UnderlineIcon,
	Undo,
} from "lucide-react";
import { looksLikeHtml } from "@/lib/cv-serializer";
import { markdownToHtml } from "@/lib/markdown-to-html";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Tiptap interprets `content` as HTML. Our pipeline stores tailored CVs and
// cover letters as markdown, so convert markdown → HTML on load. Legacy rows
// that already contain HTML pass through untouched.
function normalizeIncoming(content: string): string {
	if (!content) return "";
	return looksLikeHtml(content) ? content : markdownToHtml(content);
}

interface TiptapEditorProps {
	content: string;
	onUpdate: (content: string) => void;
	editable?: boolean;
	className?: string;
}

export function TiptapEditor({ content, onUpdate, editable = true, className }: TiptapEditorProps) {
	const onUpdateRef = useRef(onUpdate);
	onUpdateRef.current = onUpdate;

	const initialHtml = useMemo(() => normalizeIncoming(content), [content]);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
			}),
			// Without Link, StarterKit's schema strips <a> tags on parse — markdown
			// links emitted by markdownToHtml would be silently lost on save.
			Link.configure({
				openOnClick: false,
				autolink: false,
				protocols: ["http", "https", "mailto", "tel"],
				HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
			}),
			Underline,
		],
		content: initialHtml,
		editable,
		immediatelyRender: false,
		onUpdate: ({ editor: e }) => {
			onUpdateRef.current(e.getHTML());
		},
		editorProps: {
			attributes: {
				class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
			},
		},
	});

	// Update content when prop changes externally (e.g. regenerate)
	const prevContentRef = useRef(content);
	useEffect(() => {
		if (editor && content !== prevContentRef.current) {
			prevContentRef.current = content;
			editor.commands.setContent(normalizeIncoming(content));
		}
	}, [editor, content]);

	if (!editor) return null;

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			{editable && <EditorToolbar editor={editor} />}
			<EditorContent editor={editor} />
		</div>
	);
}

function ToolbarButton({
	onClick,
	active,
	children,
	title,
}: {
	onClick: () => void;
	active?: boolean;
	children: React.ReactNode;
	title: string;
}) {
	return (
		<Button
			variant="ghost"
			size="icon-xs"
			onClick={onClick}
			className={cn(active && "bg-muted text-foreground")}
			title={title}
		>
			{children}
		</Button>
	);
}

function EditorToolbar({ editor }: { editor: Editor }) {
	return (
		<div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBold().run()}
				active={editor.isActive("bold")}
				title="Bold"
			>
				<Bold className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleItalic().run()}
				active={editor.isActive("italic")}
				title="Italic"
			>
				<Italic className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				active={editor.isActive("underline")}
				title="Underline"
			>
				<UnderlineIcon className="h-3.5 w-3.5" />
			</ToolbarButton>

			<div className="mx-1 h-4 w-px bg-border" />

			<ToolbarButton
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				active={editor.isActive("heading", { level: 1 })}
				title="Heading 1"
			>
				<Heading1 className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				active={editor.isActive("heading", { level: 2 })}
				title="Heading 2"
			>
				<Heading2 className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				active={editor.isActive("heading", { level: 3 })}
				title="Heading 3"
			>
				<Heading3 className="h-3.5 w-3.5" />
			</ToolbarButton>

			<div className="mx-1 h-4 w-px bg-border" />

			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				active={editor.isActive("bulletList")}
				title="Bullet List"
			>
				<List className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				active={editor.isActive("orderedList")}
				title="Ordered List"
			>
				<ListOrdered className="h-3.5 w-3.5" />
			</ToolbarButton>

			<div className="mx-1 h-4 w-px bg-border" />

			<ToolbarButton
				onClick={() => editor.chain().focus().undo().run()}
				title="Undo"
			>
				<Undo className="h-3.5 w-3.5" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().redo().run()}
				title="Redo"
			>
				<Redo className="h-3.5 w-3.5" />
			</ToolbarButton>
		</div>
	);
}
