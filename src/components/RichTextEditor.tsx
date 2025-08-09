// components/RichTextEditor.tsx
"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const TinyMCEEditor = dynamic(
	() => import("@tinymce/tinymce-react").then((m) => m.Editor),
	{ ssr: false }
);

export default function RichTextEditor({
	value,
	onChange,
}: {
	value: string;
	onChange: (html: string) => void;
}) {
	const init = useMemo(
		() => ({
			height: 400,
			menubar: false,
			plugins: "link lists table image code media autoresize autolink", // add what you need
			toolbar:
				"undo redo | formatselect | bold italic underline | bullist numlist | link image table | code",
			content_style: "body { font-family:Inter,Arial; font-size:14px }",
			// Optional: direct image upload handler
			// images_upload_handler: async (blobInfo: any) => {
			//   const form = new FormData();
			//   form.append("file", blobInfo.blob(), blobInfo.filename());
			//   // POST to your API route that forwards to S3/Cloudinary/etc.
			//   const res = await fetch("/api/uploads", { method: "POST", body: form });
			//   if (!res.ok) throw new Error("Upload failed");
			//   const { url } = await res.json();
			//   return url; // TinyMCE will insert <img src="url" />
			// },
		}),
		[]
	);

	return (
		<TinyMCEEditor
			apiKey={process.env.NEXT_PUBLIC_TINYMCE_KEY} // or omit if self-hosting
			value={value}
			init={init}
			onEditorChange={(content) => onChange(content)}
		/>
	);
}
