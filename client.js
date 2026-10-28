window.__ModuleLoader__.load({ id: "helmd", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
/**
 * helmd client module (browser half).
 *
 * 1. Session header action: a workbench capsule button under its own slot id
 *    (`helm-d:workbench`) — it deliberately does NOT shadow the official
 *    agent-preset label, so non-helmd sessions keep the host's badge intact
 *    (upstream fix e5a68f8). Opens the workbench without navigating away,
 *    creating empty sessions, or reloading.
 * 2. Session tab bar (对话/轨迹/helmd) — fork desktop feature: registers the
 *    "helmd" conversation view carrying the full-size workbench panel, only
 *    in helmd-preset sessions; a TabErrorBoundary isolates per-tab render
 *    errors (the Intercept Log whiteout fix).
 * 3. Right sidebar workbench: four-tab panel (armor profile / case /
 *    intercept / about) rendered from official slots and DSH theme tokens.
 *
 * (fork) no star gate: the overlay, its polling and the /api/helmd/gate
 * family are intentionally absent.
 *
 * Strictly adheres to DSH design tokens (--dsw-alias-*) and zero emojis.
 */
const React = require("react");
const h = React.createElement;

const NS = "helmd";

function ChevronIcon(props) {
	const open = props && props.open;
	return h("svg", {
		viewBox: "0 0 14 14", width: 14, height: 14, fill: "none",
		stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
		"aria-hidden": "true",
		style: {
			flex: "none",
			color: "var(--dsw-alias-label-tertiary)",
			transition: "transform .16s ease",
			transform: open ? "rotate(180deg)" : "rotate(0deg)",
		},
	},
		h("path", { d: "M3.5 5.25L7 8.75l3.5-3.5" }),
	);
}

function CloseIcon(props) {
	return h("svg", {
		viewBox: "0 0 14 14", width: 14, height: 14, fill: "none",
		stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
		"aria-hidden": "true",
		style: {
			flex: "none",
			color: "var(--dsw-alias-label-tertiary)",
		},
	},
		h("path", { d: "M3.5 3.5l7 7M10.5 3.5l-7 7" }),
	);
}

function IconAgentPreset(props) {
	const size = (props && props.size) || 14;
	return h("svg", {
		width: size,
		height: size,
		viewBox: "0 0 16 16",
		fill: "none",
		className: props && props.className,
		style: Object.assign({ flex: "none" }, props && props.style),
	},
		h("mask", { id: "mask0_helmd_preset_icon", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 16, height: 16 },
			h("rect", { width: 16, height: 16, fill: "white" }),
			h("circle", { cx: 7.9995, cy: 3.28319, r: 1.712, fill: "black" }),
			h("circle", { cx: 3.51122, cy: 11.3855, r: 1.712, fill: "black" }),
			h("circle", { cx: 12.4878, cy: 11.3855, r: 1.712, fill: "black" }),
		),
		h("path", {
			mask: "url(#mask0_helmd_preset_icon)",
			d: "M12.2881 11.0425C12.6002 11.3723 13.0413 11.5786 13.5312 11.5786L13.5342 11.5776C13.1476 12.3233 12.6119 12.9785 11.9639 13.5005C10.9327 14.3309 9.6199 14.8286 8.19336 14.8286C7.29864 14.8285 6.45056 14.6313 5.6875 14.2808C6.08309 14.0281 6.36707 13.6189 6.45215 13.1392C6.99022 13.3561 7.57767 13.476 8.19336 13.4761C9.30019 13.4761 10.3157 13.0915 11.1152 12.4478C11.5935 12.0626 11.9924 11.5848 12.2881 11.0425ZM4.14746 4.36475C4.25569 4.83228 4.55488 5.2247 4.95898 5.4585C4.07956 6.30639 3.53144 7.49605 3.53125 8.81396C3.53125 9.69534 3.77613 10.5202 4.20117 11.2231C3.74959 11.3817 3.38395 11.7232 3.19531 12.1597C2.5541 11.2032 2.17969 10.052 2.17969 8.81396C2.17989 7.05087 2.93868 5.4646 4.14746 4.36475ZM8.19336 2.80029C8.85717 2.80029 9.49784 2.90834 10.0967 3.10791C12.3237 3.85044 13.9725 5.86061 14.1846 8.28369C13.9832 8.20048 13.7627 8.15382 13.5312 8.15381C13.2802 8.15381 13.042 8.20907 12.8271 8.30615C12.6281 6.47264 11.3666 4.95616 9.66895 4.39014C9.2063 4.236 8.70989 4.15186 8.19336 4.15186C7.96112 4.15189 7.7329 4.16981 7.50977 4.20264C7.51947 4.12886 7.52637 4.05348 7.52637 3.97705C7.52628 3.56604 7.3811 3.18914 7.13965 2.89404C7.48183 2.83352 7.83381 2.80033 8.19336 2.80029Z",
			fill: "currentColor",
		}),
		h("path", {
			d: "M9.1123 3.28271C9.11205 2.66858 8.61322 2.17041 7.99902 2.17041C7.38504 2.17067 6.88697 2.66874 6.88672 3.28271C6.88672 3.89691 7.38489 4.39574 7.99902 4.396C8.61338 4.396 9.1123 3.89707 9.1123 3.28271ZM10.3115 3.28271C10.3115 4.55981 9.27612 5.59521 7.99902 5.59521C6.72214 5.59496 5.6875 4.55965 5.6875 3.28271C5.68776 2.00599 6.7223 0.971447 7.99902 0.971191C9.27596 0.971191 10.3113 2.00584 10.3115 3.28271Z",
			fill: "currentColor",
		}),
		h("path", {
			d: "M4.62402 11.385C4.62377 10.7709 4.12494 10.2727 3.51074 10.2727C2.89676 10.273 2.39869 10.771 2.39844 11.385C2.39844 11.9992 2.89661 12.498 3.51074 12.4983C4.1251 12.4983 4.62402 11.9994 4.62402 11.385ZM5.82324 11.385C5.82324 12.6621 4.78784 13.6975 3.51074 13.6975C2.23386 13.6973 1.19922 12.6619 1.19922 11.385C1.19947 10.1083 2.23402 9.07374 3.51074 9.07349C4.78768 9.07349 5.82299 10.1081 5.82324 11.385Z",
			fill: "currentColor",
		}),
	);
}

// Brand mark shared by the header capsule and the right-sidebar tab. Same
// geometry as assets/helm-d-{light,dark}.svg, cropped to its ink bounds so a
// 14-16px UI slot shows the full Hd silhouette instead of a tiny glyph
// floating in a 256px viewBox.
let helmdMarkSeq = 0;
function HelmdMark(props) {
	const height = (props && props.height) || 16;
	const width = Math.round(height * 206 / 168);
	const maskId = React.useMemo(function () {
		return "helmd-mark-crack-" + (++helmdMarkSeq);
	}, []);
	return h("svg", {
		width,
		height,
		viewBox: "20 44 206 168",
		fill: "none",
		className: props && props.className,
		"aria-hidden": "true",
		style: Object.assign({ flex: "none", display: "block" }, props && props.style),
	},
		h("defs", null,
			h("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 256, height: 256 },
				h("rect", { width: 256, height: 256, fill: "#fff" }),
				h("path", {
					d: "M224 100 208 114 216 124 202 136",
					fill: "none",
					stroke: "#000",
					strokeWidth: 8,
					strokeLinecap: "round",
					strokeLinejoin: "round",
				}),
			),
		),
		h("g", {
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 28,
			strokeLinecap: "round",
			strokeLinejoin: "round",
		},
			h("path", { d: "M38 60V196M94 60V196M38 128H94" }),
			h("path", { d: "M208 60V196" }),
			h("g", { mask: "url(#" + maskId + ")" },
				h("path", { d: "M208 112C166 108 142 128 142 148C142 172 166 188 208 184" }),
			),
			h("path", { d: "M164 134 180 148 164 162", strokeWidth: 12 }),
			h("path", { d: "M184 162H198", strokeWidth: 12 }),
		),
	);
}

exports.inject = ["slots", "sidebarRight", "sidebarRightTabs"];

exports.apply = function apply(ctx) {
	// --------------------------------------------------------------------------
	// 1. Header Capsule Action Button: HelmdPresetCapsuleButton
	//    The helmd session's workbench entry under its own slot id.
	// --------------------------------------------------------------------------
	// Session tab-bar view (对话 / 轨迹 / helmd): the workbench as a first-class
	// per-session conversation view. Registered/unregistered by the capsule
	// (which knows the session's agentPreset) so the tab only exists in helmd
	// sessions; the host's slots.subscribe refreshes the tab bar live.
	// (fork desktop feature, carried over from the pre-0.5.2 client.)
	const WORKBENCH_VIEW_OPTIONS = {
		name: "conversation.view",
		id: "helmd-workbench",
		order: 15,
		label: () => "helmd",
		// `inject` receives the sessionId; its return value becomes the
		// component's props (same contract the host's chat/trajectory views use).
		inject: (sessionId) => ({ sessionId: sessionId }),
	};

	// Per-tab error isolation: one tab's render error must not blank out the
	// whole workbench panel (that was the Intercept Log whiteout). (fork)
	class TabErrorBoundary extends React.Component {
		constructor(props) { super(props); this.state = { error: null }; }
		static getDerivedStateFromError(error) {
			return { error: String((error && error.message) || error) };
		}
		render() {
			if (this.state.error) {
				return h("div", {
					style: {
						fontFamily: "var(--ds-font-family-code)", fontSize: 12, padding: 10, borderRadius: 8,
						color: "var(--dsw-alias-state-error-primary)",
						background: "var(--dsw-alias-bg-layer-2)",
						border: "0.5px solid var(--dsw-alias-border-l2)",
					},
				}, "[helmd] 此面板渲染出错（不影响其他标签页）: " + this.state.error);
			}
			return this.props.children;
		}
	}

	function HelmdWorkbenchView(props) {
		return h("div", {
			style: {
				height: "100%", overflowY: "auto", padding: 14,
				fontSize: 12, lineHeight: 1.5, boxSizing: "border-box",
			},
		},
			h(TabErrorBoundary, null,
				h(HelmdWorkbenchPanel, { sessionId: props && props.sessionId })
			)
		);
	}

	function HelmdPresetCapsuleButton(props) {
		const preset = props.useSessions ? props.useSessions(function (state) {
			const s = state.byId && state.byId[props.sessionId];
			const val = s && s.projectionValues && s.projectionValues.agentPreset;
			return typeof val === "string" ? val : undefined;
		}) : undefined;

		const [hovered, setHovered] = React.useState(false);
		const [active, setActive] = React.useState(false);

		// The session tab (对话/轨迹/helmd) exists only while THIS session runs
		// the helmd preset: register the conversation.view entry on mount and
		// dispose it on unmount / preset change (hooks stay before the early
		// returns below — unconditional hook order). (fork)
		React.useEffect(() => {
			if (preset !== "helmd") return undefined;
			let dispose = null;
			try {
				dispose = ctx.slots.inject("conversation.view", function* () {
					yield ctx.slots.register(WORKBENCH_VIEW_OPTIONS, HelmdWorkbenchView);
				});
			} catch (err) {}
			return () => {
				if (typeof dispose === "function") {
					try { dispose(); } catch (err) {}
				}
			};
		}, [preset]);

		// If no preset is associated, follow AgentPresetLabel contract and return null
		if (preset === undefined) return null;

		// Only helm-d sessions get a workbench capsule. Other presets keep the
		// official AgentPresetLabel untouched: this registration deliberately
		// uses its own id instead of shadowing `agent-preset`.
		if (preset !== "helmd") return null;

		const [open, setOpen] = React.useState(false);
		const rootRef = React.useRef(null);

		// Dismiss on outside click or Escape key
		React.useEffect(() => {
			if (!open) return;
			function handlePointerDown(e) {
				if (rootRef.current && !rootRef.current.contains(e.target)) {
					setOpen(false);
				}
			}
			function handleKeyDown(e) {
				if (e.key === "Escape") {
					setOpen(false);
				}
			}
			document.addEventListener("pointerdown", handlePointerDown, true);
			document.addEventListener("keydown", handleKeyDown, true);
			return () => {
				document.removeEventListener("pointerdown", handlePointerDown, true);
				document.removeEventListener("keydown", handleKeyDown, true);
			};
		}, [open]);

		// The right sidebar is the primary workbench surface. The popover is only
		// a fallback for hosts without the sidebarRight service — opening both at
		// once duplicated the whole panel over the conversation.
		// Capsule trigger: the right sidebar is the primary workbench surface
		// (upstream); the popover is only a fallback for hosts without the
		// sidebarRight service. On the fork the session tab (conversation.view
		// "helmd") is a parallel surface that stays reachable from the tab bar,
		// so the capsule does not try to focus it — the two never open together.
		function handleToggleWorkbench(e) {
			e.preventDefault();
			e.stopPropagation();

			const expandBtn = document.querySelector('[data-sidebar-right-expand]') ||
			                  document.querySelector('button[aria-label="打开右侧边栏"]') ||
			                  document.querySelector('button[aria-label="Open right sidebar"]');
			if (expandBtn) {
				try { expandBtn.click(); } catch (err) {}
			}

			const sid = props.sessionId;
			const activateTab = () => {
				let opened = false;
				if (ctx.sidebarRight) {
					if (sid && typeof ctx.sidebarRight.openTabIn === "function") {
						try { ctx.sidebarRight.openTabIn(sid, "eval"); opened = true; } catch (err) {}
					}
					if (typeof ctx.sidebarRight.openTab === "function") {
						try { ctx.sidebarRight.openTab("eval"); opened = true; } catch (err) {}
					}
					if (typeof ctx.sidebarRight.isExpanded === "function" && !ctx.sidebarRight.isExpanded()) {
						try {
							if (typeof ctx.sidebarRight.toggleExpanded === "function") {
								ctx.sidebarRight.toggleExpanded();
								opened = true;
							}
						} catch (err) {}
					}
				}
				return opened;
			};
			if (activateTab()) {
				setOpen(false);
				return;
			}
			setOpen((prev) => !prev);
			setTimeout(() => { if (activateTab()) setOpen(false); }, 80);
		}

		return h("div", {
			ref: rootRef,
			className: "helmd-capsule-wrapper",
			style: { position: "relative", display: "inline-flex", alignItems: "center" },
		},
			h("button", {
				type: "button",
				className: "helmd-capsule-action",
				"aria-expanded": open,
				"aria-label": "打开 helmd 安全分析工作台",
				title: "打开 helmd 安全分析工作台 (破甲 / Case / 拦截 / 关于)",
				onClick: handleToggleWorkbench,
				onMouseEnter: () => setHovered(true),
				onMouseLeave: () => { setHovered(false); setActive(false); },
				onMouseDown: () => setActive(true),
				onMouseUp: () => setActive(false),
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 5,
					height: 22,
					padding: "0 8px 0 6px",
					borderRadius: 6,
					border: `1px solid ${open || active ? "var(--dsw-alias-border-l1)" : hovered ? "var(--dsw-alias-border-l4)" : "var(--dsw-alias-border-l3)"}`,
					background: open || active ? "var(--dsw-alias-fill-tsp-active)" : hovered ? "var(--dsw-alias-fill-tsp-primary)" : "var(--dsw-alias-fill-tsp-secondary)",
					color: hovered || open ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)",
					fontSize: 12,
					fontWeight: 500,
					lineHeight: "20px",
					cursor: "pointer",
					outline: "none",
					userSelect: "none",
					transition: "background .12s ease, border-color .12s ease, color .12s ease, transform .08s ease",
					transform: active ? "scale(0.97)" : "scale(1)",
					boxSizing: "border-box",
				},
			},
				h(HelmdMark, {
					height: 16,
					style: {
						color: "var(--dsw-alias-state-success-primary)",
						opacity: 0.95,
						transition: "transform .16s ease",
						transform: hovered || open ? "scale(1.08)" : "scale(1)",
					},
				}),
				h("span", {
					style: {
						fontFamily: "inherit",
						fontWeight: 600,
						color: "var(--dsw-alias-label-primary)",
					},
				}, "helmd"),
				h("span", {
					style: {
						fontSize: 10,
						lineHeight: "13px",
						padding: "1px 4px",
						borderRadius: 4,
						background: "var(--dsw-alias-state-success-tertiary)",
						color: "var(--dsw-alias-state-success-primary)",
						fontWeight: 500,
						letterSpacing: "0.2px",
					},
				}, "工作台"),
				h(ChevronIcon, { open: open }),
			),
			open ? h("div", {
				className: "helmd-workbench-popover",
				style: {
					position: "absolute",
					top: "calc(100% + 6px)",
					left: 0,
					zIndex: 1000,
					width: 470,
					maxWidth: "min(470px, 92vw)",
					height: 580,
					maxHeight: "min(580px, 84vh)",
					borderRadius: 16,
					background: "var(--dsw-alias-bg-layer-1)",
					border: "1px solid var(--dsw-alias-border-l1)",
					boxShadow: "0 16px 36px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					animation: "helmd-fade-in .15s ease-out",
				},
			},
				h(HelmdWorkbenchPanel, {
					sessionId: props.sessionId,
					onClose: () => setOpen(false),
				})
			) : null
		);
	}

	// Keep the official agent-preset label. The capsule is a separate workbench
	// action, so non-helmd sessions are never shadowed by this plugin
	// (upstream fix e5a68f8: own id instead of shadowing "agent-preset").
	ctx.slots.inject("conversation.session.header.actions", function* () {
		yield ctx.slots.register({
			name: "conversation.session.header.actions",
			id: "helm-d:workbench",
			order: -9,
		}, HelmdPresetCapsuleButton);
	});

	// --------------------------------------------------------------------------
	// 3. Right Sidebar Workbench Tab: 破甲 / Case / 拦截 / 关于

	// ── 视觉基础（对齐 DSH 原生 token） ─────────────────────────
	// Hover / focus / scrollbar states need real CSS; structural styles stay
	// inline. The sheet renders inside the panel and is removed on unmount.
	const GREEN = "var(--dsw-alias-state-success-primary)";
	const TONE = {
		success: GREEN,
		warn: "var(--dsw-alias-state-warn-primary)",
		error: "var(--dsw-alias-state-error-primary)",
		info: "var(--dsw-alias-state-business-primary)",
		muted: "var(--dsw-alias-label-tertiary)",
	};
	const CODE = "var(--ds-font-family-code)";
	const PROFILE_META = {
		core: { tag: "全量主档", desc: "全部域规则 · 完整破甲 · 默认档" },
		stealth: { tag: "轻量隐匿", desc: "最小输出 · 只读优先 · 单目标收敛" },
		"redteam-max": { tag: "渗透加厚", desc: "全链路攻击 · 攻防双栏 · 产物成套" },
	};

	const WORKBENCH_CSS = [
		"button{appearance:none;-webkit-appearance:none;color-scheme:inherit}",
		".hm-scroll{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent}",
		".hm-scroll::-webkit-scrollbar{width:8px;height:8px}",
		".hm-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:4px;background-clip:padding-box;border:2px solid transparent}",
		".hm-scroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2)}",
		".hm-row{transition:background .1s}",
		".hm-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
		".hm-tab{transition:color .1s}",
		".hm-tab:hover{color:var(--dsw-alias-label-primary)}",
		".hm-btn{transition:background .1s,border-color .1s}",
		".hm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
		".hm-fade{animation:ds-in .12s ease-out both}",
		"@keyframes ds-in{from{opacity:0}to{opacity:1}}",
		"@media (prefers-reduced-motion: reduce){.helmd-workbench .hm-fade{animation:none!important}.helmd-workbench *{transition:none!important}}",
	].map(function (rule) {
		return rule.charAt(0) === "@" ? rule : ".helmd-workbench " + rule;
	}).join("\n");

	const S = {
		card: {
			background: "var(--dsw-alias-settings-card-fill)",
			border: "0.5px solid var(--dsw-alias-settings-card-stroke)",
			borderRadius: "var(--dsw-radius-md)",
			padding: "12px 14px",
		},
		title: { fontSize: 13, fontWeight: 600, margin: 0, color: "var(--dsw-alias-label-primary)" },
		body: { fontSize: 13, lineHeight: "20px", color: "var(--dsw-alias-label-secondary)" },
		caption: { fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)" },
		label: { fontSize: 12, fontWeight: 500, color: "var(--dsw-alias-label-tertiary)" },
		pill: function (color, quiet) {
			return {
				display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 4,
				fontSize: 10.5, lineHeight: "17px", fontWeight: 500, whiteSpace: "nowrap",
				color: quiet ? "var(--dsw-alias-label-secondary)" : color,
				background: quiet ? "var(--dsw-alias-bg-module-platform)" : "color-mix(in srgb, " + color + " 14%, transparent)",
				border: "none",
			};
		},
	};

	function CaseIcon() {
		return h("svg", {
			viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor",
			strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true",
		},
			h("path", { d: "M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" }),
			h("path", { d: "M8 12h8M8 15h5" }),
		);
	}

	function StatTile(props) {
		return h("div", {
			style: {
				flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: "var(--dsw-radius-sm)",
				background: "var(--dsw-alias-bg-layer-1)",
				border: "0.5px solid var(--dsw-alias-border-l1)",
			},
		},
			h("div", { style: S.caption }, props.label),
			h("div", {
				style: {
					marginTop: 2, fontSize: 20, fontWeight: 500, lineHeight: "26px",
					fontVariantNumeric: "tabular-nums",
					color: props.tone || "var(--dsw-alias-label-primary)",
				},
			}, String(props.value)),
			props.hint ? h("div", { style: Object.assign({}, S.caption, { marginTop: 1 }) }, props.hint) : null,
		);
	}

	function EmptyState(props) {
		return h("div", {
			style: {
				display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
				gap: 6, padding: "28px 16px", textAlign: "center",
			},
		},
			props.icon ? h("div", { style: { color: "var(--dsw-alias-label-tertiary)", display: "flex" } }, props.icon) : null,
			h("div", { style: { fontSize: 13, color: "var(--dsw-alias-label-secondary)" } }, props.title),
			props.hint ? h("div", { style: Object.assign({}, S.caption, { maxWidth: 260 }) }, props.hint) : null,
		);
	}

	// ── Tab 1: Case ──────────────────────────────────────────────
	function CaseTab(props) {
		var cd = props.caseData;
		if (!cd || !cd.active) {
			var recent = Array.isArray(cd && cd.cases) ? cd.cases : [];
			return h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
					h("span", { style: S.title }, "当前会话未绑定 case"),
					props.onRefresh ? h("button", {
						type: "button", onClick: props.onRefresh, className: "hm-btn",
						style: {
							marginLeft: "auto", height: 24, padding: "0 8px", borderRadius: 4,
							border: "0.5px solid var(--dsw-alias-border-l3)", background: "transparent",
							color: "var(--dsw-alias-label-secondary)", fontSize: 11, cursor: "pointer",
						},
					}, "刷新") : null
				),
				h("div", { style: Object.assign({}, S.caption, { marginTop: 4 }) },
					"工作台只显示本会话通过 begin_case / case_status 绑定的案件，不再自动挑磁盘上最新的 open case。"
				),
				recent.length ? h("div", { style: { marginTop: 10 } },
					h("div", { style: S.caption }, "磁盘上最近的 case（在对话里用 case_status(name) 绑定）"),
					h("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 4 } },
						recent.map(function (c) {
							return h("div", {
								key: c.name,
								style: {
									display: "flex", alignItems: "baseline", gap: 8,
									padding: "5px 6px", borderRadius: "var(--dsw-radius-xs)",
									background: "var(--dsw-alias-fill-tsp-secondary)",
								},
							},
								h("span", { style: { fontFamily: CODE, fontSize: 11, color: TONE.muted, flex: "none" } }, c.status || "?"),
								h("span", {
									style: {
										flex: 1, minWidth: 0, fontSize: 12,
										color: "var(--dsw-alias-label-secondary)",
										overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
									},
								}, c.name),
								h("span", { style: { fontSize: 11, color: TONE.muted, flex: "none" } }, (c.evidenceCount || 0) + " E")
							);
						})
					)
				) : null,
				h("div", { style: Object.assign({}, S.caption, { marginTop: 10 }) },
					"新任务先在对话里调用 begin_case(goal, samples)。"
				)
			);
		}
		var hyps = cd.hypotheses || [];
		var findings = Array.isArray(props.findings) ? props.findings : [];
		var evidence = Array.isArray(props.evidence) ? props.evidence : [];
		var hypRows = hyps.map(function (hh) {
			var color = hh.status === "confirmed" ? TONE.success
				: hh.status === "refuted" ? TONE.error
				: hh.status === "blocked" ? TONE.warn
				: TONE.info;
			return h("div", {
				key: hh.id, className: "hm-row",
				style: {
					display: "flex", alignItems: "flex-start", gap: 8,
					padding: "7px 6px", borderRadius: "var(--dsw-radius-xs)",
				},
			},
				h("span", {
					style: { width: 6, height: 6, borderRadius: 999, background: color, flex: "none", marginTop: 6 },
				}),
				h("span", {
					style: { fontFamily: CODE, fontSize: 11, lineHeight: "17px", color: TONE.muted, minWidth: 42, flex: "none" },
				}, hh.id),
				h("span", {
					style: {
						flex: 1, minWidth: 0, fontSize: 12, lineHeight: "18px",
						color: "var(--dsw-alias-label-secondary)",
					},
				}, hh.statement),
				h("span", { style: S.pill(color) }, hh.status)
			);
		});
		return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
					h("span", {
						style: {
							flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600,
							color: "var(--dsw-alias-label-primary)",
							overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
						},
					}, cd.name || "case"),
					h("button", {
						type: "button", onClick: props.onRefresh, className: "hm-btn",
						style: {
							height: 24, padding: "0 8px", borderRadius: 4,
							border: "0.5px solid var(--dsw-alias-border-l3)", background: "transparent",
							color: "var(--dsw-alias-label-secondary)", fontSize: 11, cursor: "pointer",
						},
					}, "刷新"),
					h("span", { style: S.pill(TONE.info) }, "本会话"),
					h("span", { style: S.pill(TONE.success) }, "OPEN")
				),
				cd.goal ? h("div", { style: Object.assign({}, S.body, { marginTop: 6 }) }, cd.goal) : null,
				h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 } },
					h(StatTile, { label: "Evidence", value: cd.evidenceCount || 0, tone: TONE.info }),
					h(StatTile, {
						label: "Open hypotheses",
						value: cd.openHypotheses || 0,
						tone: (cd.openHypotheses || 0) > 0 ? TONE.warn : TONE.success,
					})
				)
			),
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hyps.length ? 6 : 0 } },
					h("span", { style: S.title }, "假设"),
					h("span", { style: S.caption }, String(hyps.length))
				),
				hypRows.length > 0
					? h("div", { style: { display: "flex", flexDirection: "column", gap: 2 } }, hypRows)
					: h(EmptyState, {
						title: "还没有假设",
						hint: "用 record_hypothesis 记录可证伪的判断，再用 update_hypothesis 裁决。",
					})
			),
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: findings.length ? 6 : 0 } },
					h("span", { style: S.title }, "结论"),
					h("span", { style: S.caption }, String(findings.length))
				),
				findings.length > 0
					? h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
						findings.map(function (f, index) {
							return h("div", {
								key: "finding-" + index,
								style: {
									padding: "7px 9px", borderRadius: 4,
									background: "var(--dsw-alias-bg-layer-1)",
									border: "0.5px solid var(--dsw-alias-border-l1)",
								},
							},
								h("div", { style: { fontSize: 12, fontWeight: 500, color: "var(--dsw-alias-label-primary)" } }, f.title),
								f.detail ? h("div", { style: { marginTop: 2, fontSize: 11, lineHeight: "17px", color: "var(--dsw-alias-label-secondary)", whiteSpace: "pre-wrap" } }, f.detail.slice(0, 240)) : null,
								f.evidence ? h("div", { style: { marginTop: 3, fontFamily: CODE, fontSize: 10.5, color: TONE.muted } }, f.evidence) : null,
								f.repro
									? h("div", { style: { marginTop: 2, fontFamily: CODE, fontSize: 10.5, color: TONE.muted } }, "repro: " + f.repro)
									: h("div", { style: { marginTop: 2, fontSize: 10.5, color: TONE.warn } }, "repro: MISSING")
							);
						})
					)
					: h(EmptyState, {
						title: "还没有结论",
						hint: "record_finding 后，结论与引用的证据会出现在这里。",
					})
			),
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: evidence.length ? 6 : 0 } },
					h("span", { style: S.title }, "证据"),
					h("span", { style: S.caption }, String(evidence.length))
				),
				evidence.length > 0
					? h("div", { style: { display: "flex", flexDirection: "column", gap: 1 } },
						evidence.map(function (entry) {
							return h("div", {
								key: entry.id, className: "hm-row",
								style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 4 },
							},
								h("span", { style: { fontFamily: CODE, fontSize: 10.5, color: TONE.info, minWidth: 44, flex: "none" } }, entry.id),
								h("span", { style: { flex: 1, minWidth: 0, fontSize: 11, color: "var(--dsw-alias-label-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, entry.file)
							);
						})
					)
					: h(EmptyState, {
						title: "还没有证据",
						hint: "save_evidence 或工具输出落盘后，E 编号会出现在这里。",
					})
			)
		);
	}

	// ── Tab 2: 破甲档位（热切换） ────────────────────────────────
	function ProfileTab(props) {
		var p = props.profileData;
		if (!p || !Array.isArray(p.profiles) || p.profiles.length === 0) {
			return h("div", { style: S.card },
				h(EmptyState, {
					title: "档位目录未就绪",
					hint: "读取 profiles.dat 失败，或宿主 API 尚未注册。",
				})
			);
		}
		var active = null;
		p.profiles.forEach(function (pf) { if (pf.id === p.activeId) active = pf; });
		var activeMeta = active ? (PROFILE_META[active.id] || { tag: "", desc: "" }) : { tag: "", desc: "" };
		var rows = p.profiles.map(function (pf) {
			var isActive = pf.id === p.activeId;
			var meta = PROFILE_META[pf.id] || { tag: "", desc: "" };
			return h("button", {
				key: pf.id,
				className: "hm-row",
				type: "button",
				disabled: isActive || props.switching,
				onClick: function () { props.onSwitch(pf.id); },
				style: {
					display: "flex", alignItems: "center", gap: 10, width: "100%",
					textAlign: "left", padding: "10px 12px",
					borderRadius: "var(--dsw-radius-md)",
					cursor: isActive ? "default" : "pointer", color: "inherit",
					border: "0.5px solid " + (isActive ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-settings-card-stroke)"),
					background: "var(--dsw-alias-settings-card-fill)",
				},
			},
				h("span", {
					style: {
						width: 16, height: 16, borderRadius: 999, flex: "none",
						border: "1.5px solid " + (isActive ? GREEN : "var(--dsw-alias-border-l3)"),
						display: "flex", alignItems: "center", justifyContent: "center",
					},
				}, isActive ? h("span", { style: { width: 8, height: 8, borderRadius: 999, background: GREEN } }) : null),
				h("span", { style: { flex: 1, minWidth: 0 } },
					h("span", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
						h("span", { style: { fontSize: 13, fontWeight: 500, color: "var(--dsw-alias-label-primary)" } }, pf.name || pf.id),
						h("span", { style: { fontFamily: CODE, fontSize: 11, color: TONE.muted } }, pf.id)
					),
					h("span", { style: { display: "block", marginTop: 2, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, meta.desc || meta.tag)
				),
				h("span", {
					style: {
						flex: "none", fontSize: 12,
						color: isActive ? GREEN : "var(--dsw-alias-label-tertiary)",
					},
				}, isActive ? "当前" : "切换")
			);
		});
		return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
					h("span", { style: S.label }, "当前档位"),
					h("span", { style: S.pill(TONE.success) }, "ACTIVE")
				),
				h("div", { style: { display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 } },
					h("span", { style: { fontSize: 15, fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, active ? (active.name || active.id) : p.activeId),
					h("span", { style: { fontFamily: CODE, fontSize: 11, color: TONE.muted } }, p.activeId)
				),
				h("div", { style: { marginTop: 4, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)" } }, activeMeta.desc),
				h("div", { style: { display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } },
					h("span", { style: { width: 6, height: 6, borderRadius: 999, background: GREEN } }),
					"热切换 · 下一次模型调用生效 · 无需重启"
				)
			),
			h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" } },
				h("span", { style: S.label }, "切换档位"),
				props.switching ? h("span", { style: S.caption }, "切换中…") : null
			),
			h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, rows),
			props.error ? h("div", {
				style: {
					padding: "8px 10px", borderRadius: "var(--dsw-radius-sm)", fontSize: 12, lineHeight: "18px",
					color: TONE.error,
					background: "var(--dsw-alias-state-error-tertiary)",
					border: "0.5px solid color-mix(in srgb, " + TONE.error + " 35%, transparent)",
				},
			}, props.error) : null
		);
	}

	// ── Tab 3: 拦截日志 ──────────────────────────────────────────
	function InterceptTab(props) {
		var d = props.interceptData || {};
		var count = d.count || 0;
		function line(prefix, value, tone) {
			return h("div", { style: { display: "flex", gap: 8 } },
				h("span", { style: { color: tone || GREEN, flex: "none" } }, prefix),
				h("span", { style: { color: "var(--dsw-alias-label-secondary)", wordBreak: "break-word" } }, value)
			);
		}
		return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 } },
					h("div", null,
						h("div", { style: S.label }, "流式拦截"),
						h("div", { style: { marginTop: 2, fontSize: 20, fontWeight: 500, lineHeight: "26px", fontVariantNumeric: "tabular-nums", color: count > 0 ? GREEN : "var(--dsw-alias-label-primary)" } }, String(count)),
						h("div", { style: S.caption }, "已拦截并走恢复阶梯的拒答次数")
					),
					h("span", { style: S.pill(count > 0 ? TONE.success : TONE.muted) }, count > 0 ? "ACTIVE" : "IDLE")
				),
				h("div", { style: Object.assign({}, S.body, { marginTop: 6 }) }, "实时挂载在 LLM 流式输出前置节点，识别拒答并自动替换为技术交付物。")
			),
			h("div", {
				style: {
					borderRadius: "var(--dsw-radius-md)", overflow: "hidden",
					border: "0.5px solid var(--dsw-alias-border-l1)",
					background: "var(--dsw-alias-markdown-code-block)",
				},
			},
				h("div", {
					style: {
						display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
						borderBottom: "0.5px solid var(--dsw-alias-border-l1)",
					},
				},
					["var(--dsw-alias-state-error-primary)", "var(--dsw-alias-state-warn-primary)", "var(--dsw-alias-state-success-primary)"].map(function (c) {
						return h("span", { key: c, style: { width: 7, height: 7, borderRadius: 999, background: c, opacity: 0.8 } });
					}),
					h("span", { style: { marginLeft: 4, fontFamily: CODE, fontSize: 11, color: TONE.muted } }, "helmd-stream-intercept.log")
				),
				h("div", {
					className: "hm-scroll",
					style: {
						padding: "10px 12px", fontFamily: CODE, fontSize: 11, lineHeight: "18px",
						maxHeight: 220, overflowY: "auto",
					},
				},
					line("[STREAM-OK]", "拦截器已上线 · 已处理 " + count + " 次"),
					d.lastTime ? line("[LAST]", d.lastTime, TONE.muted) : null,
					d.lastSnippet ? line("[REFUSAL]", "\"" + d.lastSnippet + "\"", TONE.warn) : null,
					line("[AUDIT]", "~/.dsh/helmd-stream-intercept.log", TONE.muted)
				)
			)
		);
	}

	// ── Tab 4: 关于 ──────────────────────────────────────────────
	function AboutTab(props) {
		var state = React.useState(null);
		var result = state[0]; var setResult = state[1];
		var busy = React.useState(false);
		var checking = busy[0]; var setChecking = busy[1];
		var fail = React.useState("");
		var error = fail[0]; var setError = fail[1];

		function check() {
			setChecking(true);
			setError("");
			fetch("/api/helmd/update").then(function (r) { return r.json(); }).then(function (j) {
				if (j && j.ok) {
					setResult(j.data);
					if (j.data && j.data.error) setError(j.data.error);
				} else {
					setError((j && j.error) || "检查失败");
				}
			}).catch(function (e) {
				setError(String((e && e.message) || e));
			}).then(function () { setChecking(false); });
		}

		var version = String((result && result.currentVersion) || props.version || "unknown").replace(/^v/i, "");
		var latest = result && result.latestVersion ? String(result.latestVersion).replace(/^v/i, "") : "";
		var linkStyle = { color: "var(--dsw-alias-state-business-primary)", textDecoration: "none" };
		var codeStyle = {
			margin: "8px 0 0", padding: "10px 12px",
			borderRadius: "var(--dsw-radius-sm)",
			background: "var(--dsw-alias-markdown-code-block)",
			border: "0.5px solid var(--dsw-alias-border-l1)",
			fontFamily: CODE, fontSize: 11, lineHeight: "17px",
			color: "var(--dsw-alias-label-secondary)", overflowX: "auto",
		};
		var fallbackChanges = [
			"移植上游 0.5.2：Case 会话隔离 + 每轮 [helm-d case] 提示注入",
			"假设账本（record_hypothesis / update_hypothesis）与 repro_cmd 结论门禁",
			"L3 自主状态包 + L4-lite 调度建议；破甲档位热切换（core / stealth / redteam-max）",
			"工作台改为破甲 / Case / 拦截 / 关于；工具数 33；移除 find_tool 与模型评测",
			"（fork）无星标弹窗；会话标签栏工作台保留；胶囊改用独立槽位 id",
		];
		var changes = result && Array.isArray(result.releaseNotes) && result.releaseNotes.length > 0
			? result.releaseNotes
			: fallbackChanges;
		var disclaimer = "仅供学习交流与授权安全评估。使用者须自行确保所有操作均在本人拥有的资产或已获得书面授权的范围内进行。未经授权对他人系统进行扫描、探测或入侵属于违法行为。本项目按 MIT “原样”提供，不附带任何担保。部分代码由 AI 辅助生成，使用前请自行审查。";

		return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
			h("div", { style: S.card },
				h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } },
					h("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
						h("span", { style: S.title }, "关于"),
						h("span", { style: S.caption }, "helmd")
					),
					h("button", {
						type: "button", className: "hm-btn", disabled: checking, onClick: check,
						style: {
							height: 28, padding: "0 10px", borderRadius: "var(--dsw-radius-sm)",
							border: "0.5px solid var(--dsw-alias-border-l3)", background: "transparent",
							color: "var(--dsw-alias-label-primary)", fontSize: 12, fontFamily: "inherit",
							cursor: checking ? "default" : "pointer",
						},
					}, checking ? "检查中…" : "检查更新")
				),
				h("div", { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } },
					"当前版本 ", h("span", { style: { fontFamily: CODE } }, "v" + version)
				),
				result && latest
					? h("div", { style: { marginTop: 4, fontSize: 12, color: result.updateAvailable ? "var(--dsw-alias-state-warn-primary)" : "var(--dsw-alias-state-success-primary)" } },
						result.updateAvailable
							? "远端版本 v" + latest + " · 当前 v" + version
							: "已是最新版本 v" + version
					)
					: h("div", { style: { marginTop: 4, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } },
						"检查 GitHub Releases 的远端版本"
					),
				error ? h("div", { style: { marginTop: 4, fontSize: 11, color: "var(--dsw-alias-state-error-primary)", wordBreak: "break-word" } },
					"检查失败：" + error
				) : null,
				result && latest && result.updateAvailable
					? h("div", { style: { marginTop: 4, fontSize: 12 } },
						h("a", { href: result.releaseUrl || "https://github.com/Fleey/helm-deepseek-harnessn/releases/latest", target: "_blank", rel: "noopener noreferrer", style: linkStyle }, "打开 Releases")
					)
					: null,
				h("div", { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } },
					"上游作者 ",
					h("a", { href: "https://github.com/ADWMC", target: "_blank", rel: "noopener noreferrer", style: linkStyle }, "ADWMC"),
					" · ",
					h("a", { href: "https://github.com/ADWMC/helm-d", target: "_blank", rel: "noopener noreferrer", style: linkStyle }, "ADWMC/helm-d"),
					"（本仓库为其桌面版适配 fork：",
					h("a", { href: "https://github.com/Fleey/helm-deepseek-harnessn", target: "_blank", rel: "noopener noreferrer", style: linkStyle }, "Fleey/helm-deepseek-harnessn"),
					"）"
				)
			),
			h("div", { style: S.card },
				h("div", { style: S.title }, "更新地址"),
				h("div", { style: Object.assign({}, S.body, { marginTop: 4 }) },
					h("a", { href: "https://github.com/Fleey/helm-deepseek-harnessn/releases", target: "_blank", rel: "noopener noreferrer", style: linkStyle }, "github.com/Fleey/helm-deepseek-harnessn/releases")
				),
				h("pre", { style: codeStyle }, "dsh plugin --profile web add https://github.com/Fleey/helm-deepseek-harnessn/releases/download/vX.Y.Z/helmd.tgz"),
				h("div", { style: Object.assign({}, S.caption, { marginTop: 6 }) }, "版本化 URL（带 vX.Y.Z）——latest/download 滚动地址写进 profile 依赖后，下次发版会让 pnpm lockfile 的 sha512 失配")
			),
				h("div", { style: S.card },
					h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
						h("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
							h("span", { style: S.title }, "更新日志"),
							h("span", { style: S.caption }, result && latest ? "Releases v" + latest : "内置摘要")
						),
						h("a", { href: "https://github.com/Fleey/helm-deepseek-harnessn/blob/main/CHANGELOG.md", target: "_blank", rel: "noopener noreferrer", style: Object.assign({}, S.caption, linkStyle) }, "完整日志")
					),
				h("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 8 } },
					changes.map(function (line) {
						return h("div", { key: line, style: { fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)" } }, "· " + line);
					})
				)
			),
			h("div", { style: S.card },
				h("div", { style: S.title }, "免责声明"),
				h("div", { style: Object.assign({}, S.body, { marginTop: 4, fontSize: 12, lineHeight: "18px" }) }, disclaimer)
			)
		);
	}

	// ── 工作台面板 ────────────────────────────────────────────────
	function HelmdWorkbenchPanel(props) {
		// Dynamic data fetching (polled from host API routes)
		var apiData = React.useState({});
		var data = apiData[0]; var setData = apiData[1];
		var reload = React.useState(0);
		var reloadTick = reload[0]; var setReloadTick = reload[1];
		React.useEffect(function () {
			var alive = true;
			function poll() {
				var sid = null;
				try {
					if (props.sessionId) sid = props.sessionId;
					else if (ctx.sidebarRight && ctx.sidebarRight.mounted && typeof ctx.sidebarRight.mounted.getSnapshot === "function") {
						sid = ctx.sidebarRight.mounted.getSnapshot();
					}
				} catch (err) {}
				var caseQuery = sid ? "?sessionId=" + encodeURIComponent(String(sid)) : "";
				Promise.all([
					fetch('/api/helmd/tools').then(function(r){return r.json()}).catch(function(){return null}),
					fetch('/api/helmd/intercept').then(function(r){return r.json()}).catch(function(){return null}),
					fetch('/api/helmd/health').then(function(r){return r.json()}).catch(function(){return null}),
					fetch('/api/helmd/case' + caseQuery).then(function(r){return r.json()}).catch(function(){return null}),
					fetch('/api/helmd/profile').then(function(r){return r.json()}).catch(function(){return null}),
					fetch('/api/helmd/case/findings' + caseQuery).then(function(r){return r.json()}).catch(function(){return null}),
					fetch('/api/helmd/case/evidence' + caseQuery).then(function(r){return r.json()}).catch(function(){return null}),
				]).then(function(results) {
					if (!alive) return;
					setData({
						tools: (results[0] && results[0].data) || [],
						intercept: (results[1] && results[1].data) || null,
						health: (results[2] && results[2].data) || null,
						caseData: (results[3] && results[3].data) || null,
						profile: (results[4] && results[4].data) || null,
						findings: (results[5] && results[5].data) || [],
						evidence: (results[6] && results[6].data) || [],
					});
				});
			}
			poll();
			var timer = setInterval(poll, 15000);
			return function() { alive = false; clearInterval(timer); };
		}, [reloadTick]);
		function refresh() { setReloadTick(function (n) { return n + 1; }); }
		var active = React.useState("profile");
		var tab = active[0]; var setTab = active[1];
		React.useEffect(function () { if (tab === "case") refresh(); }, [tab]);
		var switching = React.useState(false);
		var isSwitching = switching[0]; var setSwitching = switching[1];
		var profileError = React.useState("");
		var profileErr = profileError[0]; var setProfileErr = profileError[1];

		function switchTo(id) {
			setSwitching(true);
			setProfileErr("");
			fetch('/api/helmd/profile', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: id }),
			})
				.then(function (r) { return r.json(); })
				.then(function (res) {
					if (res && res.ok) {
						setData(function (prev) { return Object.assign({}, prev, { profile: res.data }); });
					} else {
						setProfileErr((res && res.error) || "切换失败");
					}
				})
				.catch(function (e) { setProfileErr(String((e && e.message) || e)); })
				.then(function () { setSwitching(false); });
		}

		var tabs = [
			{ key: "profile", label: "破甲", badge: 0 },
			{ key: "case", label: "Case", badge: (data.caseData && data.caseData.active && data.caseData.openHypotheses) || 0 },
			{ key: "intercept", label: "拦截", badge: (data.intercept && data.intercept.count) || 0 },
			{ key: "about", label: "关于", badge: 0 },
		];

		var openCase = data.caseData && data.caseData.active ? (data.caseData.openHypotheses || 0) : null;
		var toolCount = (data.tools && data.tools.length) || 0;
		var liveProfile = (data.profile && data.profile.activeId) || "core";

		return h("div", {
			className: "helmd-workbench",
			style: {
				display: "flex", flexDirection: "column", height: "100%",
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)", boxSizing: "border-box",
			},
		},
			h("style", null, WORKBENCH_CSS),
			h("div", {
				style: {
					padding: "12px 12px 0",
					borderBottom: "0.5px solid var(--dsw-alias-border-l2)",
				},
			},
				h("div", { style: { display: "flex", alignItems: "flex-start", gap: 8 } },
					h("div", { style: { flex: 1, minWidth: 0 } },
						h("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
							h("span", { style: { fontSize: 14, fontWeight: 600 } }, "安全分析"),
							h("span", { style: { fontSize: 11, color: TONE.muted } }, (data.health && data.health.version) || "dev")
						),
						h("div", { style: { marginTop: 2, fontSize: 12, color: TONE.muted } },
							liveProfile + " · " + toolCount + " 个工具"
							+ (openCase === null ? "" : " · " + openCase + " 个未决假设")
						)
					),
					props.onClose ? h("button", {
						type: "button", onClick: props.onClose, "aria-label": "关闭", className: "hm-btn",
						style: {
							width: 28, height: 28, borderRadius: "var(--dsw-radius-sm)", border: "none",
							background: "transparent", color: "var(--dsw-alias-label-secondary)",
							cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 6,
						},
					}, h(CloseIcon, null)) : null
				),
				h("div", { style: { display: "flex", gap: 18, marginTop: 10 } },
					tabs.map(function (t) {
						var current = tab === t.key;
						return h("button", {
							key: t.key, type: "button", className: "hm-tab",
							onClick: function () { setTab(t.key); },
							style: {
								position: "relative", padding: "7px 1px 9px",
								border: 0, background: "none",
								fontSize: 13, lineHeight: "20px", fontWeight: 400,
								color: current
									? "var(--dsw-alias-label-primary)"
									: "var(--dsw-alias-label-tertiary)",
								cursor: "pointer",
							},
						},
							t.label,
							t.badge ? h("span", {
								style: {
									marginLeft: 4, fontSize: 11, color: "var(--dsw-alias-label-tertiary)",
									fontVariantNumeric: "tabular-nums",
								},
							}, String(t.badge)) : null,
							current ? h("span", {
								"aria-hidden": "true",
								style: {
									position: "absolute", left: 0, right: 0, bottom: -1, height: 2,
									borderRadius: "2px 2px 0 0",
									background: "var(--dsw-alias-label-primary)",
								},
							}) : null
						);
					})
				)
			),
			h("div", {
				className: "hm-scroll",
				style: { flex: 1, overflowY: "auto", padding: 12 },
			},
				h("div", {
					key: tab, className: "hm-fade",
					style: { display: "flex", flexDirection: "column", gap: 10 },
				},
					// (fork) per-tab error boundary: one tab's render error must
					// not blank out the whole panel.
					h(TabErrorBoundary, null,
						tab === "profile" ? h(ProfileTab, { profileData: data.profile, onSwitch: switchTo, switching: isSwitching, error: profileErr }) : null,
						tab === "case" ? h(CaseTab, { caseData: data.caseData, findings: data.findings, evidence: data.evidence, onRefresh: refresh }) : null,
						tab === "intercept" ? h(InterceptTab, { interceptData: data.intercept }) : null,
						tab === "about" ? h(AboutTab, { version: (data.health && data.health.version) || "unknown" }) : null
					)
				)
			)
		);
	}

	function HelmdTabTitle() {
		return h("div", { style: { display: "flex", alignItems: "center", gap: 5 } },
			h(HelmdMark, { height: 14, style: { color: "var(--dsw-alias-state-success-primary)" } }),
			h("span", null, "helmd 工作台"),
		);
	}

	if (ctx.sidebarRightTabs && typeof ctx.sidebarRightTabs.register === "function") {
		ctx.effect(() => {
			return ctx.sidebarRightTabs.register({
				id: "helm-d:eval",
				kind: "eval",
				title: () => "helmd 工作台",
				guide: [{ id: "helmd", order: 20, title: () => "helmd 工作台", description: () => "破甲档位 / Case / 拦截日志 / 关于" }],
			});
		}, "helmd: sidebar tab definition");
	}

	ctx.slots.inject("sidebar.right.pane.tab", function* () {
		yield ctx.slots.register({ name: "sidebar.right.pane.tab", key: "helm-d:eval" }, HelmdWorkbenchPanel);
		yield ctx.slots.register({ name: "sidebar.right.pane.tab", key: "eval" }, HelmdWorkbenchPanel);
	});

	ctx.slots.inject("sidebar.right.pane.tab.title", function* () {
		yield ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: "helm-d:eval" }, HelmdTabTitle);
		yield ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: "eval" }, HelmdTabTitle);
	});

	// (fork) the star gate overlay is intentionally absent: the fork removed
	// the gate, its popup and helmd_unlock — there is no /api/helmd/gate family.
};
return module.exports;
} });

// Alias registration for legacy / alternate IDs
try {
	if (window.__ModuleLoader__ && typeof window.__ModuleLoader__.load === "function") {
		window.__ModuleLoader__.load({ id: "helm-d", factory: (require) => window.__ModuleLoader__.require("helmd") });
		window.__ModuleLoader__.load({ id: "@dsh-security/helmd", factory: (require) => window.__ModuleLoader__.require("helmd") });
	}
} catch (e) {}
