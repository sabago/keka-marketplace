"use client";

import Link from "next/link";
import { Twitter, Linkedin, Mail } from "lucide-react";
import { useSettings } from "@/lib/useSettings";

function FooterClient() {
	const { settings } = useSettings();

	return (
		<>
			<footer className="bg-gray-800 text-gray-300 pt-14 mt-18">
				<div className="container mx-auto px-6 max-w-[1200px]">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10">
						{/* Column 1 — Brand */}
						<div>
							<div className="flex items-center gap-2 mb-3">
								<span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] text-white flex items-center justify-center font-bold text-base flex-shrink-0">
									M
								</span>
								<span className="flex items-baseline gap-1 text-[19px] leading-none">
									<span className="font-semibold text-white">Mastering</span>
									<span className="font-bold text-[#48ccbc]">HomeCare</span>
								</span>
							</div>
							<p className="text-sm text-gray-400 leading-relaxed max-w-xs">
								A HIPAA-aware platform for Massachusetts home-care and AFC agencies.
								Track credentials, source referrals, stay compliant.
							</p>
							<div className="flex gap-2 mt-4">
								<a
									href="#"
									aria-label="Twitter"
									className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
								>
									<Twitter className="w-3.5 h-3.5" />
								</a>
								<a
									href="#"
									aria-label="LinkedIn"
									className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
								>
									<Linkedin className="w-3.5 h-3.5" />
								</a>
								{settings.contactEmail && (
									<a
										href={`mailto:${settings.contactEmail}`}
										aria-label="Email"
										className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
									>
										<Mail className="w-3.5 h-3.5" />
									</a>
								)}
							</div>
						</div>

						{/* Column 2 — Product */}
						<div>
							<h4 className="text-white text-sm font-semibold mb-4">Product</h4>
							<ul className="space-y-2 text-sm leading-loose">
								<li>
									<Link
										href="/dashboard"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Dashboard
									</Link>
								</li>
								<li>
									<Link
										href="/knowledge-base"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Knowledge Base
									</Link>
								</li>
								<li>
									<Link
										href="/agency/compliance"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Credential Tracker
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/referrals"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Referral Tracker
									</Link>
								</li>
								<li>
									<Link
										href="/marketplace"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Marketplace
									</Link>
								</li>
							</ul>
						</div>

						{/* Column 3 — Company */}
						<div>
							<h4 className="text-white text-sm font-semibold mb-4">Company</h4>
							<ul className="space-y-2 text-sm leading-loose">
								<li>
									<Link
										href="/"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										About Ugabot
									</Link>
								</li>
								<li>
									<Link
										href="/pricing"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Pricing
									</Link>
								</li>
								{settings.contactEmail && (
									<li>
										<a
											href={`mailto:${settings.contactEmail}`}
											className="text-gray-400 hover:text-[#48ccbc] transition-colors"
										>
											Contact
										</a>
									</li>
								)}
								<li>
									<Link
										href="#"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Careers
									</Link>
								</li>
							</ul>
						</div>

						{/* Column 4 — Legal & Trust */}
						<div>
							<h4 className="text-white text-sm font-semibold mb-4">
								Legal &amp; Trust
							</h4>
							<ul className="space-y-2 text-sm leading-loose">
								<li>
									<Link
										href="#"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Privacy Policy
									</Link>
								</li>
								<li>
									<Link
										href="#"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Terms of Service
									</Link>
								</li>
								<li>
									<Link
										href="#"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										HIPAA Posture
									</Link>
								</li>
								<li>
									<Link
										href="/agency/audit-log"
										className="text-gray-400 hover:text-[#48ccbc] transition-colors"
									>
										Audit Logs
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</footer>

			{/* Deep footer band */}
			<div className="bg-gray-900 py-4 text-xs text-gray-500">
				<div className="container mx-auto px-6 max-w-[1200px] flex justify-between items-center flex-wrap gap-2">
					<span>
						© {new Date().getFullYear()} Ugabot, Inc. · Mastering HomeCare is a
						product of Ugabot.
					</span>
					<span className="font-mono">HIPAA-aware · Built for home care</span>
				</div>
			</div>
		</>
	);
}

export default function Footer() {
	return <FooterClient />;
}
