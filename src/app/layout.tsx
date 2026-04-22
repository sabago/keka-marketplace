import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DirectoryChatbot from "@/components/DirectoryChatbot";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Mastering HomeCare",
	description: "A HIPAA-aware platform for Massachusetts home-care and AFC agencies. Track credentials, source referrals, stay compliant.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
			>
				<Providers>
					<Header />
					<main className="flex-grow">{children}</main>
					<Footer />
					<DirectoryChatbot />
				</Providers>
			</body>
		</html>
	);
}
