// components/SafeHtml.tsx
"use client";
import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

export default function SafeHtml({
	html,
	className,
}: {
	html: string;
	className?: string;
}) {
	const clean = useMemo(
		() => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
		[html]
	);
	return (
		<div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
	);
}
