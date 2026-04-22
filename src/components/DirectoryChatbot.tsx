"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	MessageCircle,
	X,
	Send,
	Loader2,
	MapPin,
	ExternalLink,
	BookOpen,
	ShieldCheck,
	Sparkles,
	ShieldAlert,
} from "lucide-react";

type Mode = "directory" | "credentials";

interface Message {
	role: "user" | "assistant";
	content: string;
	sources?: { slug: string; title: string }[];
	timestamp: Date;
}

interface ChatbotResponse {
	answer?: string;
	sources?: { slug: string; title: string }[] | string[];
	sourceTitles?: string[];
	queriesRemaining?: number;
	remaining?: number; // query route uses this field name
	limit?: number;
	plan?: string;
	error?: string;
	message?: string;
	upgradeRequired?: boolean;
	cached?: boolean;
}

const SUGGESTED_QUESTIONS: Record<Mode, string[]> = {
	directory: [
		"I'm a new agency — where should I start to get referrals?",
		"How do I get referrals from hospitals in Massachusetts?",
		"What are ASAPs and how do I get listed?",
	],
	credentials: [
		"Who has an expired license on my team?",
		"Which staff are missing required documents?",
		"Send a reminder to staff with expiring credentials",
	],
};

const QUICK_PILLS: Record<Mode, { label: string; query: string }[]> = {
	directory: [
		{ label: "Boston hospitals", query: "Which hospitals in Boston have online referral portals?" },
		{ label: "Veteran sources", query: "Show me free referral sources for veterans" },
		{ label: "Mass General", query: "How do I refer to Mass General?" },
	],
	credentials: [
		{ label: "Expired licenses", query: "Who has an expired license on my team?" },
		{ label: "Missing docs", query: "Which staff are missing required documents?" },
		{ label: "Send reminders", query: "Send a reminder to staff with expiring credentials" },
	],
};

function storageKey(userId: string, mode: Mode) {
	return `chatbot:${userId}:${mode}`;
}

function loadMessages(userId: string, mode: Mode): Message[] {
	try {
		const raw = localStorage.getItem(storageKey(userId, mode));
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		// Rehydrate timestamp strings back to Date objects
		return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
	} catch {
		return [];
	}
}

function saveMessages(userId: string, mode: Mode, messages: Message[]) {
	try {
		// Keep last 50 messages per mode to avoid unbounded growth
		const trimmed = messages.slice(-50);
		localStorage.setItem(storageKey(userId, mode), JSON.stringify(trimmed));
	} catch {}
}

function clearMessages(userId: string) {
	try {
		localStorage.removeItem(storageKey(userId, "directory"));
		localStorage.removeItem(storageKey(userId, "credentials"));
	} catch {}
}

function formatTime(d: Date): string {
	const now = new Date();
	const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
	const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

	if (d >= startOfToday) return time;
	if (d >= startOfYesterday) return `Yesterday ${time}`;
	if (d >= startOfWeek) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
	return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function DirectoryChatbot() {
	const { data: session, status } = useSession();
	const [isOpen, setIsOpen] = useState(false);
	const [mode, setMode] = useState<Mode>("directory");
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [queriesRemaining, setQueriesRemaining] = useState<number | null>(null);
	const [queryLimit, setQueryLimit] = useState<number | null>(null);
	const [limitReached, setLimitReached] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const prevUserIdRef = useRef<string | null>(null);

	const isLoggedIn = !!session?.user;
	const userId = (session?.user as any)?.id as string | undefined;
	const userRole = (session?.user as any)?.role as string | undefined;
	const userInitial = (
		(session?.user?.name?.[0] ?? (session?.user?.email?.[0] ?? "U"))
	).toUpperCase();
	const isUnlimited =
		session?.user &&
		["BUSINESS", "ENTERPRISE"].includes((session.user as any).plan);
	const showModeToggle =
		userRole === "AGENCY_ADMIN" ||
		userRole === "AGENCY_USER" ||
		userRole === "PLATFORM_ADMIN" ||
		userRole === "SUPERADMIN";

	// Load history from localStorage when user session resolves
	useEffect(() => {
		if (status === "loading") return;
		if (userId && userId !== prevUserIdRef.current) {
			prevUserIdRef.current = userId;
			setMessages(loadMessages(userId, mode));
		}
		// User logged out — clear state
		if (!userId && prevUserIdRef.current) {
			clearMessages(prevUserIdRef.current);
			prevUserIdRef.current = null;
			setMessages([]);
		}
	}, [userId, status, mode]);

	// Persist messages to localStorage whenever they change
	useEffect(() => {
		if (userId && messages.length > 0) {
			saveMessages(userId, mode, messages);
		}
	}, [messages, userId, mode]);

	useEffect(() => {
		const handler = () => setIsOpen(true);
		window.addEventListener("open-directory-chatbot", handler);
		return () => window.removeEventListener("open-directory-chatbot", handler);
	}, []);

	useEffect(() => {
		if (isOpen && inputRef.current && isLoggedIn) {
			inputRef.current.focus();
		}
	}, [isOpen, isLoggedIn]);

	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages, loading]);

	const switchMode = (newMode: Mode) => {
		if (newMode === mode) return;
		setMode(newMode);
		setMessages(userId ? loadMessages(userId, newMode) : []);
		setLimitReached(false);
		setQueriesRemaining(null);
		setQueryLimit(null);
		setInput("");
	};

	const sendMessage = async (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || loading || limitReached) return;

		const userMessage: Message = { role: "user", content: trimmed, timestamp: new Date() };
		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setLoading(true);

		const endpoint =
			mode === "credentials" ? "/api/chatbot/credentials" : "/api/chatbot/directory";
		const bodyKey = "message";

		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ [bodyKey]: trimmed }),
			});

			const data: ChatbotResponse = await res.json();

			if (res.status === 429 || data.error === "QUERY_LIMIT_REACHED") {
				setLimitReached(true);
				setMessages((prev) => [
					...prev,
					{
						role: "assistant",
						content:
							data.message ||
							"Your agency has used all its AI queries for this month.",
						timestamp: new Date(),
					},
				]);
				return;
			}

			if (!res.ok || data.error) {
				setMessages((prev) => [
					...prev,
					{
						role: "assistant",
						content: data.message || data.error || "Sorry, something went wrong. Please try again.",
						timestamp: new Date(),
					},
				]);
				return;
			}

			const remaining = data.queriesRemaining ?? data.remaining;
			if (remaining !== undefined) setQueriesRemaining(remaining);
			if (data.limit !== undefined) setQueryLimit(data.limit);

			// Notify any usage widgets on the page to refresh their count
			window.dispatchEvent(new CustomEvent("chatbot-query-used"));

			// Normalize sources: directory returns [{slug, title}], query route returns string[]
			let normalizedSources: { slug: string; title: string }[] = [];
			if (data.sources && data.sourceTitles) {
				// query route: sources is string[], sourceTitles is string[]
				normalizedSources = (data.sources as string[]).map((slug, i) => ({
					slug,
					title: data.sourceTitles![i] || slug,
				}));
			} else if (data.sources) {
				normalizedSources = (
					data.sources as { slug: string; title: string }[]
				).filter((s) => s.title);
			}

			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: data.answer || "",
					sources: normalizedSources,
					timestamp: new Date(),
				},
			]);
		} catch {
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content:
						"Unable to reach the assistant. Please check your connection and try again.",
					timestamp: new Date(),
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		sendMessage(input);
	};

	return (
		<>
			{/* Floating trigger button */}
			<button
				onClick={() => setIsOpen(true)}
				aria-label="Open AI assistant"
				className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#0B4F96] text-white rounded-full shadow-lg hover:bg-[#0a4280] transition-all ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
			>
				<span className="sm:hidden p-3.5">
					<MessageCircle className="w-5 h-5" />
				</span>
				<span className="hidden sm:flex items-center gap-2 px-4 py-3 whitespace-nowrap">
					<MessageCircle className="w-5 h-5" />
					<span className="text-sm font-medium">Ask AI Assistant</span>
				</span>
			</button>

			{/* Chat panel */}
			{isOpen && (
				<div
					className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
					style={{ maxHeight: "min(600px, calc(100vh - 48px))" }}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-3 bg-[#0B4F96] text-white flex-shrink-0">
						<div className="flex items-center gap-2">
							<MessageCircle className="w-5 h-5" />
							<span className="font-semibold text-sm">
								{mode === "credentials"
									? "Credentials Assistant"
									: "Referral Source Assistant"}
							</span>
							{mode === "directory" && (
								<span className="flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
									<MapPin className="w-3 h-3" />
									MA
								</span>
							)}
						</div>
						<button
							onClick={() => setIsOpen(false)}
							className="p-1 rounded-full hover:bg-white/20 transition-colors"
							aria-label="Close"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Mode toggle — agency admins/staff only */}
					{isLoggedIn && showModeToggle && (
						<div className="flex border-b border-gray-100 flex-shrink-0">
							<button
								onClick={() => switchMode("directory")}
								className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
									mode === "directory"
										? "text-[#0B4F96] border-b-2 border-[#0B4F96] bg-blue-50/50"
										: "text-gray-500 hover:text-gray-700"
								}`}
							>
								<BookOpen className="w-3.5 h-3.5" />
								Referral Directory
							</button>
							<button
								onClick={() => switchMode("credentials")}
								className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
									mode === "credentials"
										? "text-[#0B4F96] border-b-2 border-[#0B4F96] bg-blue-50/50"
										: "text-gray-500 hover:text-gray-700"
								}`}
							>
								<ShieldCheck className="w-3.5 h-3.5" />
								My Credentials
							</button>
						</div>
					)}

					{/* Body */}
					{!isLoggedIn ? (
						<div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
							<div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
								<MessageCircle className="w-6 h-6 text-[#0B4F96]" />
							</div>
							<div>
								<p className="font-semibold text-gray-900 mb-1">
									Sign in to use the AI assistant
								</p>
								<p className="text-sm text-gray-500">
									Browse and read all 124 referral source guides for free. Sign in to ask
									questions and get personalized answers.
								</p>
							</div>
							<Link
								href="/auth/signin"
								className="w-full py-2.5 bg-[#0B4F96] text-white rounded-lg text-sm font-medium hover:bg-[#0a4280] transition-colors text-center"
							>
								Sign In
							</Link>
							<p className="text-xs text-gray-400">
								Your agency needs a MHC account.{" "}
								<Link href="/auth/signup" className="text-[#0B4F96] hover:underline">
									Register your agency →
								</Link>
							</p>
						</div>
					) : (
						<>
							{/* Mode subtitle for credentials */}
							{mode === "credentials" && (
								<div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
									<p className="text-xs text-blue-700">
										Ask about your staff's documents, compliance status, or send
										reminders.
									</p>
								</div>
							)}

							{/* Query counter */}
							{!isUnlimited && queryLimit !== null && (
								<div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
									<p className="text-xs text-gray-500">
										{queriesRemaining !== null
											? `${queriesRemaining} of ${queryLimit} free queries remaining this month`
											: `${queryLimit} shared queries/month on your plan`}
									</p>
								</div>
							)}

							{/* Messages */}
							<div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
								{messages.length === 0 && (
									<div className="space-y-3">
										{/* Welcome bubble */}
										<div className="flex items-start gap-2 justify-start">
											<div className="w-6 h-6 rounded-full bg-[#48ccbc] flex items-center justify-center flex-shrink-0 mt-0.5">
												<Sparkles className="w-3.5 h-3.5 text-white" />
											</div>
											<div className="max-w-[85%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm bg-gray-100 text-gray-800">
												{mode === "credentials"
													? "Hi! I can help you check your staff's credential status, find expiring documents, and send compliance reminders. What would you like to know?"
													: "Hi! I'm your AI assistant for Massachusetts home care referral sources. I can help you find information about hospitals, insurance programs, veteran services, and community platforms. Ask me anything!"}
											</div>
										</div>
										{/* PHI disclaimer */}
										<div className="flex items-start gap-2 px-1 py-2 bg-amber-50 border border-amber-200 rounded-lg">
											<ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
											<p className="text-xs text-amber-700 leading-snug">
												Do not enter patient names, SSNs, or other protected health information (PHI). This assistant is for operational use only.
											</p>
										</div>
										{/* Suggested questions */}
										<div className="space-y-2">
											{SUGGESTED_QUESTIONS[mode].map((q) => (
												<button
													key={q}
													onClick={() => sendMessage(q)}
													className="w-full text-left text-sm px-3 py-2.5 bg-gray-50 hover:bg-blue-50 hover:text-[#0B4F96] rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
												>
													{q}
												</button>
											))}
										</div>
									</div>
								)}

								{messages.map((msg, i) => (
									<div
										key={i}
										className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
									>
										{/* Bot icon — left, assistant only */}
										{msg.role === "assistant" && (
											<div className="w-6 h-6 rounded-full bg-[#48ccbc] flex items-center justify-center flex-shrink-0 mt-0.5">
												<Sparkles className="w-3.5 h-3.5 text-white" />
											</div>
										)}

										<div className="flex flex-col gap-0.5 max-w-[80%]">
											<div
												className={`rounded-2xl px-3.5 py-2.5 text-sm ${
													msg.role === "user"
														? "bg-[#0B4F96] text-white rounded-br-sm"
														: "bg-gray-100 text-gray-800 rounded-bl-sm"
												}`}
											>
												{msg.role === "assistant" ? (
													<div className="prose prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mt-2 [&_h2]:mt-2 [&_h3]:mt-2 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_strong]:font-semibold prose-a:text-blue-600">
														<ReactMarkdown remarkPlugins={[remarkGfm]}>
															{msg.content}
														</ReactMarkdown>
													</div>
												) : (
													<p className="leading-relaxed">{msg.content}</p>
												)}
												{msg.sources && msg.sources.length > 0 && (
													<div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
														<p className="text-xs text-gray-500 font-medium">Sources:</p>
														{msg.sources.map((s) => (
															<Link
																key={s.slug}
																href={`/knowledge-base/${s.slug}`}
																className="flex items-center gap-1 text-xs text-[#0B4F96] hover:underline"
															>
																<ExternalLink className="w-3 h-3 flex-shrink-0" />
																{s.title}
															</Link>
														))}
													</div>
												)}
											</div>
											{/* Timestamp */}
											<span className={`text-[10px] text-gray-400 ${msg.role === "user" ? "text-right" : "text-left"}`}>
												{formatTime(msg.timestamp)}
											</span>
										</div>

										{/* User icon — right, user only */}
										{msg.role === "user" && (
											<div className="w-6 h-6 rounded-full bg-[#0B4F96] flex items-center justify-center flex-shrink-0 mt-0.5">
												<span className="text-[10px] font-bold text-white">{userInitial}</span>
											</div>
										)}
									</div>
								))}

								{loading && (
									<div className="flex items-start gap-2 justify-start">
										<div className="w-6 h-6 rounded-full bg-[#48ccbc] flex items-center justify-center flex-shrink-0">
											<Sparkles className="w-3.5 h-3.5 text-white" />
										</div>
										<div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
											<Loader2 className="w-4 h-4 animate-spin text-gray-400" />
										</div>
									</div>
								)}

								{limitReached && (
									<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
										<p className="font-medium text-amber-800 mb-1">
											Monthly query limit reached
										</p>
										<Link
											href="/agency/subscription"
											className="text-[#0B4F96] hover:underline font-medium"
										>
											Upgrade your plan →
										</Link>
									</div>
								)}

								<div ref={messagesEndRef} />
							</div>

							{/* Input */}
							<form
								onSubmit={handleSubmit}
								className="flex items-center gap-2 px-3 pt-3 pb-2 border-t border-gray-100 flex-shrink-0"
							>
								<input
									ref={inputRef}
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder={
										limitReached
											? "Query limit reached"
											: mode === "credentials"
												? "Ask about staff credentials..."
												: "Ask about referral sources..."
									}
									disabled={loading || limitReached}
									className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0B4F96] disabled:bg-gray-50 disabled:text-gray-400"
								/>
								<button
									type="submit"
									disabled={!input.trim() || loading || limitReached}
									className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-[#0B4F96] text-white rounded-full hover:bg-[#0a4280] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									aria-label="Send"
								>
									<Send className="w-4 h-4" />
								</button>
							</form>

							{/* Quick-pick pills — visible while conversation is fresh */}
							{messages.length <= 1 && !limitReached && (
								<div className="flex flex-wrap gap-1.5 px-3 pb-3 flex-shrink-0">
									{QUICK_PILLS[mode].map((pill) => (
										<button
											key={pill.label}
											type="button"
											onClick={() => sendMessage(pill.query)}
											disabled={loading}
											className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-blue-50 hover:text-[#0B4F96] transition-colors disabled:opacity-40"
										>
											{pill.label}
										</button>
									))}
								</div>
							)}
						</>
					)}
				</div>
			)}
		</>
	);
}
