"use client";

import Header from "@/components/Header";
import React from "react";

export default function AdminPageLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			{/* Hero Section */}
			<section style={{ backgroundColor: "#48ccbc" }} className="text-white">
				<div className="w-full">
					<img
						src="/images/marketplacehomeimage.jpg"
						alt="Healthcare professionals providing home care services"
						className="w-full h-auto object-cover rounded-lg shadow-lg"
					/>
				</div>
			</section>

			{/* Navigation Header */}
			<Header />

			{/* Page Content */}
			{children}
		</>
	);
}
