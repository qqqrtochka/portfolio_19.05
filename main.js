/* ==========================================================================
   Interaction helpers
   - Fullscreen screen swap (3 windows) on desktop
   - Anchor navigation without smooth scrolling
   - Scroll reveal + text stagger + ambient accents
   - Copy-to-clipboard for email
   - Current year in footer
   ========================================================================== */

(() => {
	const prefersReducedMotion =
		window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
	const desktopScreenMode = window.matchMedia("(min-width: 921px)");

	const setActiveNavLink = (sectionId) => {
		const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
		navLinks.forEach((link) => {
			const hash = link.getAttribute("href");
			link.classList.toggle("is-active", Boolean(sectionId) && hash === `#${sectionId}`);
		});
	};

	const updateHeaderHeight = () => {
		const header = document.querySelector(".site-header");
		if (!header) return;
		document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
	};

	const initAmbientAnimations = () => {
		const logoDot = document.querySelector(".logo__dot");
		if (logoDot) logoDot.classList.add("is-pulse");

		const heroName = document.querySelector(".hero__name");
		if (heroName) heroName.classList.add("is-animated-name");

		if (prefersReducedMotion) return;

		const ambientSelectors = [".hero__tiles .tile", ".facts .fact", ".projects .project"];
		const ambientItems = [];
		const seen = new Set();

		ambientSelectors.forEach((selector) => {
			document.querySelectorAll(selector).forEach((item) => {
				if (seen.has(item)) return;
				seen.add(item);
				ambientItems.push(item);
			});
		});

		ambientItems.forEach((item, index) => {
			item.classList.add("is-ambient");
			item.style.setProperty("--ambient-delay", `${index * 180}ms`);
			item.style.setProperty("--ambient-duration", `${5600 + index * 380}ms`);
		});
	};

	const initTextStaggerAnimations = () => {
		if (prefersReducedMotion) return;

		const selectors = [
			".hero__name",
			".hero__role",
			".section__title",
			".card__title",
			".tile__title",
			".fact__key",
		];

		const animatedNodes = [];
		const seen = new Set();

		selectors.forEach((selector) => {
			document.querySelectorAll(selector).forEach((node, nodeIndex) => {
				if (seen.has(node) || node.classList.contains("text-stagger")) return;
				seen.add(node);

				const originalText = node.textContent?.trim() || "";
				if (!originalText) return;

				const fragments = document.createDocumentFragment();
				const tokens = originalText.split(/(\s+)/);
				let wordIndex = 0;

				tokens.forEach((token) => {
					if (!token) return;
					if (/^\s+$/.test(token)) {
						fragments.append(document.createTextNode(token));
						return;
					}

					const word = document.createElement("span");
					word.className = "word";
					word.style.setProperty("--word-index", String(wordIndex));
					word.setAttribute("aria-hidden", "true");
					word.textContent = token;
					fragments.append(word);
					wordIndex += 1;
				});

				node.textContent = "";
				node.append(fragments);
				node.classList.add("text-stagger");
				node.style.setProperty("--text-delay", `${Math.min(nodeIndex * 40, 180)}ms`);
				node.setAttribute("aria-label", originalText);
				animatedNodes.push(node);
			});
		});

		if (!animatedNodes.length) return;
		if (!("IntersectionObserver" in window)) {
			animatedNodes.forEach((node) => node.classList.add("is-visible"));
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					entry.target.classList.toggle("is-visible", entry.isIntersecting);
				});
			},
			{
				threshold: 0.4,
				rootMargin: "0px 0px -8% 0px",
			}
		);

		animatedNodes.forEach((node) => observer.observe(node));
	};

	const initRevealAnimations = () => {
		const revealSelectors = [
			".hero__copy > *",
			".hero__tiles > *",
			".facts > *",
			"#about .about > *",
			"#about .skills",
			"#projects .projects > *",
			"#contact .contact > *",
			".footer__inner > *",
		];

		const revealElements = [];
		const seen = new Set();

		revealSelectors.forEach((selector) => {
			const elements = document.querySelectorAll(selector);
			elements.forEach((element, index) => {
				if (seen.has(element)) return;
				seen.add(element);

				element.classList.add("reveal");
				element.style.setProperty("--reveal-delay", `${Math.min(index * 70, 280)}ms`);
				revealElements.push(element);
			});
		});

		if (!revealElements.length) return;

		if (prefersReducedMotion || !("IntersectionObserver" in window)) {
			revealElements.forEach((element) => element.classList.add("is-visible"));
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					entry.target.classList.toggle("is-visible", entry.isIntersecting);
				});
			},
			{
				threshold: 0.2,
				rootMargin: "0px 0px -10% 0px",
			}
		);

		revealElements.forEach((element) => observer.observe(element));
	};

	const initScreenSwapNavigation = () => {
		const screenContainer = document.getElementById("content");
		const screens = Array.from(screenContainer?.querySelectorAll("[data-screen]") ?? []);

		if (!screenContainer || screens.length < 2) {
			return { goToHashTarget: () => false };
		}

		const navByScreenId = {
			home: "",
			about: "about",
			contact: "contact",
		};

		let activeScreenIndex = 0;
		let isWheelLocked = false;
		let wheelUnlockTimer = 0;
		let scrollSyncTimer = 0;

		const clampScreenIndex = (index) => Math.max(0, Math.min(screens.length - 1, index));
		const getContainerTopPadding = () =>
			Number.parseFloat(window.getComputedStyle(screenContainer).paddingTop) || 0;

		const updateActiveNav = (screenId, preferredNavId = "") => {
			const nextNavId = preferredNavId || navByScreenId[screenId] || screenId;
			setActiveNavLink(nextNavId);
		};

		const syncActiveIndexByScroll = (preferredNavId = "") => {
			const scrollTop = screenContainer.scrollTop + getContainerTopPadding();
			let nearestIndex = 0;
			let nearestDistance = Number.POSITIVE_INFINITY;

			screens.forEach((screen, index) => {
				const distance = Math.abs(screen.offsetTop - scrollTop);
				if (distance < nearestDistance) {
					nearestDistance = distance;
					nearestIndex = index;
				}
			});

			activeScreenIndex = nearestIndex;
			updateActiveNav(screens[activeScreenIndex].id, preferredNavId);
		};

		const goToScreen = (targetIndex, options = {}) => {
			const { updateHash = true, preferredNavId = "", instant = false } = options;
			const safeIndex = clampScreenIndex(targetIndex);
			const screen = screens[safeIndex];
			if (!screen) return false;

			activeScreenIndex = safeIndex;
			const targetTop = Math.max(0, screen.offsetTop - getContainerTopPadding());
			screenContainer.scrollTo({
				top: targetTop,
				behavior: instant || prefersReducedMotion ? "auto" : "smooth",
			});

			updateActiveNav(screen.id, preferredNavId);

			if (updateHash) {
				const nextHash = `#${preferredNavId || screen.id}`;
				history.replaceState(null, "", nextHash);
			}

			return true;
		};

		const goToHashTarget = (hash) => {
			if (!hash || hash === "#") return false;
			if (hash === "#top" || hash === "#home") {
				return goToScreen(0, { preferredNavId: "" });
			}

			const target = document.querySelector(hash);
			if (!target) return false;

			const screen = target.closest("[data-screen]");
			if (!screen) return false;

			const screenIndex = screens.indexOf(screen);
			if (screenIndex === -1) return false;

			const preferredNavId = hash.slice(1);
			return goToScreen(screenIndex, { preferredNavId });
		};

		const stepScreen = (direction) => {
			if (!desktopScreenMode.matches || isWheelLocked) return;

			const nextIndex = clampScreenIndex(activeScreenIndex + direction);
			if (nextIndex === activeScreenIndex) return;

			isWheelLocked = true;
			window.clearTimeout(wheelUnlockTimer);
			goToScreen(nextIndex, { preferredNavId: "" });
			wheelUnlockTimer = window.setTimeout(() => {
				isWheelLocked = false;
			}, prefersReducedMotion ? 80 : 620);
		};

		screenContainer.addEventListener(
			"wheel",
			(event) => {
				if (!desktopScreenMode.matches) return;
				if (Math.abs(event.deltaY) < 6) return;
				event.preventDefault();
				stepScreen(event.deltaY > 0 ? 1 : -1);
			},
			{ passive: false }
		);

		document.addEventListener("keydown", (event) => {
			if (!desktopScreenMode.matches) return;

			const activeElement = document.activeElement;
			const isEditable =
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					activeElement.tagName === "SELECT" ||
					activeElement.isContentEditable);
			if (isEditable) return;

			if (event.key === "ArrowDown" || event.key === "PageDown") {
				event.preventDefault();
				stepScreen(1);
				return;
			}

			if (event.key === "ArrowUp" || event.key === "PageUp") {
				event.preventDefault();
				stepScreen(-1);
				return;
			}

			if (event.key === "Home") {
				event.preventDefault();
				goToScreen(0, { preferredNavId: "" });
				return;
			}

			if (event.key === "End") {
				event.preventDefault();
				goToScreen(screens.length - 1, { preferredNavId: "contact" });
				return;
			}

			if (event.code === "Space") {
				event.preventDefault();
				stepScreen(event.shiftKey ? -1 : 1);
			}
		});

		screenContainer.addEventListener(
			"scroll",
			() => {
				window.clearTimeout(scrollSyncTimer);
				scrollSyncTimer = window.setTimeout(() => {
					syncActiveIndexByScroll();
				}, 40);
			},
			{ passive: true }
		);

		const handleScreenModeChange = () => {
			updateHeaderHeight();
			isWheelLocked = false;
			syncActiveIndexByScroll();
			goToScreen(activeScreenIndex, { updateHash: false, instant: true });
		};

		desktopScreenMode.addEventListener("change", handleScreenModeChange);

		if (window.location.hash && !goToHashTarget(window.location.hash)) {
			goToScreen(0, { updateHash: false, preferredNavId: "", instant: true });
		}

		if (!window.location.hash) {
			goToScreen(0, { updateHash: false, preferredNavId: "", instant: true });
		}

		return { goToHashTarget };
	};

	updateHeaderHeight();
	window.addEventListener("resize", updateHeaderHeight, { passive: true });

	const screenSwapNavigation = initScreenSwapNavigation();

	// Internal anchors without smooth interpolation
	document.addEventListener("click", (event) => {
		const link = event.target?.closest?.('a[href^="#"]');
		if (!link) return;

		const hash = link.getAttribute("href");
		if (!hash || hash === "#") return;

		event.preventDefault();

		if (screenSwapNavigation.goToHashTarget(hash)) return;

		const target = document.querySelector(hash);
		if (!target) return;

		target.scrollIntoView({
			behavior: "auto",
			block: "start",
		});
		history.replaceState(null, "", hash);
	});

	// Copy-to-clipboard (used in Contacts)
	document.addEventListener("click", async (event) => {
		const button = event.target?.closest?.("[data-copy]");
		if (!button) return;

		const value = button.getAttribute("data-copy") || "";
		if (!value) return;

		const originalText = button.textContent || "Копировать";
		button.disabled = true;

		try {
			await navigator.clipboard.writeText(value);
			button.textContent = "Скопировано";
			window.setTimeout(() => {
				button.textContent = originalText;
				button.disabled = false;
			}, 1300);
		} catch {
			button.disabled = false;
			window.prompt("Скопируйте значение:", value);
		}
	});

	// Hamburger menu toggle
	const navToggle = document.querySelector(".nav-toggle");
	const nav = document.querySelector(".nav");
	if (navToggle && nav) {
		const closeMobileNav = () => {
			nav.classList.remove("is-open");
			navToggle.setAttribute("aria-expanded", "false");
			navToggle.setAttribute("aria-label", "Открыть меню");
		};

		navToggle.addEventListener("click", (e) => {
			e.stopPropagation();
			const isOpen = nav.classList.toggle("is-open");
			navToggle.setAttribute("aria-expanded", String(isOpen));
			navToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
		});

		// Close when a nav link is clicked
		nav.querySelectorAll(".nav__link, .nav > .btn").forEach((link) => {
			link.addEventListener("click", closeMobileNav);
		});

		// Close when clicking outside the nav
		document.addEventListener("click", (e) => {
			if (!nav.contains(e.target)) closeMobileNav();
		});
	}

	// Current year
	const year = document.querySelector("[data-year]");
	if (year) year.textContent = String(new Date().getFullYear());

	initAmbientAnimations();
	initRevealAnimations();
	initTextStaggerAnimations();
})();
