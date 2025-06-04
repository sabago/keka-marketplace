"use client";

import Header from "@/components/Header";
import React from "react";

export default function ClientWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Header />
			{children}
		</>
	);
}
