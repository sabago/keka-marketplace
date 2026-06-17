"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, Linkedin, Mail } from "lucide-react";
import { useSettings } from "@/lib/useSettings";

function FooterClient() {
	const { settings } = useSettings();

	return (
		<>
			<footer className="bg-gray-800 pt-14 mt-18" style={{ color: 'rgba(255,255,255,0.85)' }}>
				<div className="container mx-auto px-6 max-w-[1200px]">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10">
						{/* Column 1 — Brand */}
						<div>
							<div className="mb-3">
								<Image
									src="/images/logo-full.png"
									alt="Mastering HomeCare"
									width={160}
									height={40}
									className="object-contain"
								/>
							</div>
							<p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
								A HIPAA-aware platform for Massachusetts home-care and AFC agencies.
								Track credentials, source referrals, stay compliant.
							</p>
							<div className="flex gap-2 mt-4">
								<a href="#" aria-label="Twitter" className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
									onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)') }
									onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)') }>
									<Twitter className="w-3.5 h-3.5" />
								</a>
								<a href="#" aria-label="LinkedIn" className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
									onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)') }
									onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)') }>
									<Linkedin className="w-3.5 h-3.5" />
								</a>
								{settings.contactEmail && (
									<a href={`mailto:${settings.contactEmail}`} aria-label="Email" className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
										onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)') }
										onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)') }>
										<Mail className="w-3.5 h-3.5" />
									</a>
								)}
							</div>
						</div>

						{/* Column 2 — Product */}
						<div>
							<h4 className="text-white text-sm font-semibold mb-4">Product</h4>
							<ul className="space-y-2 text-sm leading-loose">
								{[
									{ label: 'Dashboard', href: '/dashboard' },
									{ label: 'Resources', href: '/resources' },
									{ label: 'Credential Tracker', href: '/agency/compliance' },
									{ label: 'Referral Tracker', href: '/dashboard/referrals' },
									{ label: 'Marketplace', href: '/marketplace' },
								].map(({ label, href }) => (
									<li key={label}>
										<Link href={href} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}
											onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'white')}
											onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)')}>
											{label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Column 3 — Company */}
						<div>
							<h4 className="text-white text-sm font-semibold mb-4">Company</h4>
							<ul className="space-y-2 text-sm leading-loose">
								{[
									{ label: 'About', href: '/about' },
									{ label: 'Memberships', href: '/memberships' },
									{ label: 'Blog', href: '/blog' },
									{ label: 'Contact', href: '/contact' },
								].map(({ label, href }) => (
									<li key={label}>
										<Link href={href} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}
											onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'white')}
											onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)')}>
											{label}
										</Link>
									</li>
								))}
								{settings.contactEmail && (
									<li>
										<a href={`mailto:${settings.contactEmail}`} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}
											onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'white')}
											onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)')}>
											Email Us
										</a>
									</li>
								)}
							</ul>
						</div>

						{/* Column 4 — Legal & Trust */}
						<div>
							<h4 className="text-white text-sm font-semibold mb-4">Legal &amp; Trust</h4>
							<ul className="space-y-2 text-sm leading-loose">
								{[
									{ label: 'Privacy Policy', href: '#' },
									{ label: 'Terms of Service', href: '#' },
									{ label: 'HIPAA Posture', href: '#' },
									{ label: 'Audit Logs', href: '/agency/audit-log' },
								].map(({ label, href }) => (
									<li key={label}>
										<Link href={href} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}
											onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'white')}
											onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)')}>
											{label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</footer>

			{/* Deep footer band */}
			<div className="bg-gray-900 py-4 text-xs text-gray-500">
				<div className="container mx-auto px-6 max-w-[1200px] flex justify-between items-center flex-wrap gap-2">
					<span>© 2026 Mastering HomeCare. All rights reserved.</span>
					<span className="font-mono">HIPAA-aware · Built for home care</span>
				</div>
			</div>
		</>
	);
}

export default function Footer() {
	return <FooterClient />;
}
