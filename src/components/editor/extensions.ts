import StarterKit from "@tiptap/starter-kit";

// Shared extension list used by TiptapEditor (client) and round-trip tests
// (jsdom). StarterKit v3 already bundles Link and Underline, so we configure
// them through StarterKit's options rather than registering separate
// instances — registering a second `link` extension produces duplicate
// schema entries and Tiptap's resolution between them is implementation-
// defined. Co-locating here also means schema regressions are caught by the
// link-survival tests in `tiptap-editor.test.ts`.
export const editorExtensions = [
	StarterKit.configure({
		heading: { levels: [1, 2, 3] },
		link: {
			openOnClick: false,
			autolink: false,
			protocols: ["http", "https", "mailto", "tel"],
			HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
		},
	}),
];
