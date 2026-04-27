import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

// Shared extension list used by TiptapEditor (client) and round-trip tests
// (jsdom). Co-locating the schema means a regression that removes Link or
// changes its config is caught by the link-survival test in
// `tiptap-editor.test.ts` instead of silently dropping <a> tags on save.
export const editorExtensions = [
	StarterKit.configure({
		heading: { levels: [1, 2, 3] },
	}),
	Link.configure({
		openOnClick: false,
		autolink: false,
		protocols: ["http", "https", "mailto", "tel"],
		HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
	}),
	Underline,
];
